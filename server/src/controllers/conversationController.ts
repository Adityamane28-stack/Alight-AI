import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const listConversations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        model: true,
        systemPrompt: true,
        temperature: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json({ conversations });
  } catch (error: any) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
};

export const createConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { title, model, systemPrompt, temperature } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title?.trim() || 'New Chat',
        model: model || 'gemini-3.6-flash',
        systemPrompt: systemPrompt || null,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      },
    });

    res.status(201).json({ conversation });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

export const getConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
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

    res.json({ conversation });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

export const updateConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const { title, model, systemPrompt, temperature } = req.body;

    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(model !== undefined && { model }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(temperature !== undefined && { temperature: Number(temperature) }),
      },
    });

    res.json({ conversation: updated });
  } catch (error: any) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
};

export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    await prisma.conversation.delete({
      where: { id },
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

