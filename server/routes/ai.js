import { Router } from 'express';
import {
  getAiStatus,
  testAiConnection,
  generateChatReplies,
  generateCaptions,
  generateMassMessage,
  improveCaption,
  generateOnboarding,
  generatePpvCopy,
  generateRenewalMessage,
} from '../lib/ai.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getAiStatus());
});

router.post('/test', async (_req, res) => {
  try {
    const result = await testAiConnection();
    res.json(result);
  } catch (error) {
    console.error('AI test:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/reply', async (req, res) => {
  try {
    const suggestions = await generateChatReplies(req.body);
    res.json({ ok: true, suggestions });
  } catch (error) {
    console.error('AI reply:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/caption', async (req, res) => {
  try {
    const captions = await generateCaptions(req.body);
    res.json({ ok: true, captions });
  } catch (error) {
    console.error('AI caption:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/mass-message', async (req, res) => {
  try {
    const message = await generateMassMessage(req.body);
    res.json({ ok: true, message });
  } catch (error) {
    console.error('AI mass:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/improve-caption', async (req, res) => {
  try {
    const caption = await improveCaption(req.body);
    res.json({ ok: true, caption });
  } catch (error) {
    console.error('AI improve-caption:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/onboarding', async (req, res) => {
  try {
    const pack = await generateOnboarding(req.body);
    res.json({ ok: true, ...pack });
  } catch (error) {
    console.error('AI onboarding:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/ppv-copy', async (req, res) => {
  try {
    const variants = await generatePpvCopy(req.body);
    res.json({ ok: true, variants });
  } catch (error) {
    console.error('AI ppv:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/renewal', async (req, res) => {
  try {
    const pack = await generateRenewalMessage(req.body);
    res.json({ ok: true, ...pack });
  } catch (error) {
    console.error('AI renewal:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

export default router;