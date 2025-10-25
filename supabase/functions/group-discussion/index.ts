import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, participants, aggression, history } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    const aggressionLevels: Record<string, string> = {
      'Friendly': 'friendly and supportive',
      'Moderate': 'moderately challenging',
      'Intense': 'highly competitive and challenging',
    };

    const prompt = `You are simulating ${participants} AI participants in a group discussion about "${topic}".
The discussion style should be ${aggressionLevels[aggression] || 'moderate'}.

Previous discussion:
${history.map((h: any) => `${h.name}: ${h.message}`).join('\n')}

Generate the next response from one of the AI participants. The response should:
1. Be natural and conversational
2. Reference previous points made
3. Add new insights or perspectives
4. Match the ${aggression} discussion style

Format as JSON: { "participant": "AI Participant X", "message": "response text" }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;

    // Extract JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : { participant: "AI Participant 1", message: content };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in group-discussion:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
