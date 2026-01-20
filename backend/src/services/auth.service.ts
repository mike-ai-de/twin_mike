import prisma from '../lib/prisma';
import { nanoid } from 'nanoid';
import config from '../config';

export class AuthService {
  /**
   * Create a magic link for authentication
   */
  async createMagicLink(email: string): Promise<{ token: string; expiresAt: Date }> {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.magicLink.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // In production, send email with link
    // For MVP, just log it
    console.log(`🔗 Magic link for ${email}: ${token}`);
    console.log(`   Full link: ${config.CORS_ORIGIN}/auth/verify?token=${token}`);

    return { token, expiresAt };
  }

  /**
   * Verify magic link and return JWT
   */
  async verifyMagicLink(token: string): Promise<{ personId: string; email: string } | null> {
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink) {
      return null;
    }

    // Check expiration
    if (magicLink.expiresAt < new Date()) {
      return null;
    }

    // Check if already used
    if (magicLink.usedAt) {
      return null;
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    // Find or create person
    let person = await prisma.person.findUnique({
      where: { email: magicLink.email },
    });

    if (!person) {
      person = await prisma.person.create({
        data: {
          email: magicLink.email,
          displayName: magicLink.email.split('@')[0], // Use email prefix as default name
        },
      });
    }

    return {
      personId: person.id,
      email: person.email!,
    };
  }
}

export const authService = new AuthService();
