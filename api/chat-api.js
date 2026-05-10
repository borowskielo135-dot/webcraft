// Plik: api/chat.js
export default async function handler(req, res) {
  // Ten kod wykonuje się na serwerze Vercel, nikt go nie widzi pod F12
  const MOJ_KLUCZ = process.env.GROQ_API_KEY; // Tu Vercel sam wstawi Twój klucz

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MOJ_KLUCZ}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: req.body.messages,
        }),
      },
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Błąd połączenia z AI" });
  }
}
