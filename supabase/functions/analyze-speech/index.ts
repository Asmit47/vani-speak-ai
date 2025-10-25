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
    const { text, topic, type } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    let prompt = '';
    if (type === 'speech') {
      prompt = `Analyze this speech about "${topic}" and provide constructive feedback:

Text: ${text}

Provide feedback on:
1. Content quality and relevance
2. Clarity and coherence
3. Vocabulary and language use
4. Areas for improvement

Give a score out of 100 and detailed feedback.`;
    } else if (type === 'interview') {
      prompt = `Evaluate this interview answer:

Question context: ${topic}
Answer: ${text}

Provide:
1. Strengths of the answer
2. Areas for improvement
3. Communication clarity
4. Score out of 100`;
    }

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
    const feedback = data.candidates[0].content.parts[0].text;

    // Extract score from feedback
    const scoreMatch = feedback.match(/(\d+)\s*\/\s*100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    return new Response(
      JSON.stringify({ feedback, score }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-speech:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
