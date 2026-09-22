import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { streamUnifiedChat } from '../services/llmService.js';

export const streamMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const { conversationId, message, model, systemPrompt, temperature, customKeys } = req.body;

  if (!conversationId || !message || !message.trim()) {
    res.status(400).json({ error: 'conversationId and message are required' });
    return;
  }

  try {
    // 1. Validate conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // 2. Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message.trim(),
      },
    });

    // 3. Auto-title conversation if it's the first message or titled "New Chat"
    if (conversation.title === 'New Chat' || conversation.messages.length === 0) {
      const trimmedTitle = message.trim().slice(0, 40).replace(/[\r\n]+/g, ' ');
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: trimmedTitle },
      }).catch((e) => console.warn('Title update non-fatal error:', e));
    }

    // 4. Safe sanitization of optional settings
    const validTemp =
      typeof temperature === 'number' && !isNaN(temperature)
        ? Math.min(Math.max(temperature, 0), 1)
        : undefined;

    const validModel =
      typeof model === 'string' && model.trim()
        ? model.trim()
        : undefined;

    // Update conversation settings if provided
    if (validModel || systemPrompt !== undefined || validTemp !== undefined) {
      const updateData: any = {};
      if (validModel) updateData.model = validModel;
      if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt ? String(systemPrompt).trim() : null;
      if (validTemp !== undefined) updateData.temperature = validTemp;

      await prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
      }).catch((e) => console.warn('Settings update non-fatal error:', e));
    }

    // 5. Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send the user message ID back so client maps it
    res.write(`data: ${JSON.stringify({ userMessageId: userMessage.id })}\n\n`);

    // 6. Format history for LLM
    const history = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const activeModel = validModel || conversation.model || 'gemini-3.6-flash';
    const activeSystemPrompt = systemPrompt !== undefined ? systemPrompt : conversation.systemPrompt;
    const activeTemp = validTemp !== undefined ? validTemp : conversation.temperature;

    let assistantFullResponse = '';

    // Handle client disconnect
    let isClientConnected = true;
    req.on('close', () => {
      isClientConnected = false;
    });

    // 7. Stream from Unified Provider Router (with Multi-Key pool & Cross-Provider Failover)
    const stream = streamUnifiedChat({
      model: activeModel,
      systemPrompt: activeSystemPrompt,
      temperature: activeTemp,
      history,
      newMessage: message.trim(),
      customKeys,
    });

    for await (const chunk of stream) {
      if (!isClientConnected) break;
      assistantFullResponse += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    // 8. Save assistant response to DB
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantFullResponse,
      },
    });

    // Update conversation updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    // 9. Send completion signal
    res.write(`data: ${JSON.stringify({ done: true, assistantMessageId: assistantMessage.id })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || 'Failed to stream response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Stream error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
};
