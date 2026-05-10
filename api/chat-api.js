export default async function handler(req, res) {
  const MOJ_KLUCZ = process.env.GROQ_API_KEY;

  // Sprawdzamy czy to POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body; // Wyciągamy wiadomości z zapytania

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MOJ_KLUCZ}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Błąd serwera:", error);
    res.status(500).json({ error: "Błąd połączenia z AI" });
  }
}
