export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { symptoms } = req.body;
  if (!symptoms || symptoms.trim() === '') return res.status(400).json({ error: 'Symptômes manquants' });

  const apiKey = process.env.Openai_API_Key;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée' });

  const prompt = `Tu es un assistant médical spécialisé en gynécologie-obstétrique pour le Dr. El Hassan ZEFT à Agadir, Maroc.
Contexte clinique: ${symptoms}
Propose des médicaments disponibles et autorisés au Maroc avec noms commerciaux marocains.
Réponds UNIQUEMENT en JSON valide sans markdown:
{"medications":[{"name":"DCI (Nom commercial Maroc)","dose":"posologie","duration":"durée","note":"contre-indications","category":"catégorie"}]}
Maximum 5 médicaments.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'Tu es un assistant médical expert en gynécologie au Maroc. Tu réponds toujours en JSON valide uniquement.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Erreur OpenAI', details: err });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    let medications;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      medications = parsed.medications || parsed;
    } catch (e) { medications = null; }

    return res.status(200).json({ medications, raw: text });

  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
}
