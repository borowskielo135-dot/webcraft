import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).end();

  try {
    const data = request.body;
    const fileName = `lead-${Date.now()}.json`;

    // Zapisujemy dane jako plik JSON w Twoim Blobie
    const blob = await put(fileName, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return response.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
