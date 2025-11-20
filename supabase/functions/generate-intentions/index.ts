import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personalMission, userFeedback } = await req.json();

    console.log('Generating intentions for personal mission:', personalMission);
    console.log('User feedback:', userFeedback);

    const systemPrompt = `You are an AI assistant that generates daily intentions based on a user's personal mission. 
Generate exactly 3 creative, actionable intentions that align with the user's broader values and goals.

Examples of good intentions:
- "Make everyone feel valued and respected"
- "Live the day without fear"
- "Learn something new from mundane tasks"
- "Keep a straight and confident posture"
- "Notice what makes you smile"
- "Notice and react to others' emotions"
- "Treat every task with maximum focus"

Intentions should be:
- Simple and clear
- Can be broad or specific, but never vague
- Actionable in daily life
- Aligned with the personal mission provided

CRITICAL: Return ONLY a valid JSON array with exactly 3 strings. Example format:
["intention 1", "intention 2", "intention 3"]

Do not include any other text, explanations, or formatting. Just the JSON array.`;

    let userPrompt = `Personal Mission: "${personalMission}"

Generate 3 creative intentions that align with this personal mission.`;

    if (userFeedback) {
      userPrompt += `\n\nUser's feedback on previous intentions: "${userFeedback}"
Please adjust the new intentions based on this feedback while still aligning with the personal mission.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate intentions', details: errorText }), 
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    const generatedText = data.choices[0].message.content;
    console.log('Generated text:', generatedText);
    let intentions;
    
    try {
      const parsed = JSON.parse(generatedText.trim());
      // If it's already an array, use it; otherwise look for intentions property
      intentions = Array.isArray(parsed) ? parsed : (parsed.intentions || [generatedText]);
    } catch (e) {
      console.error('Failed to parse intentions:', e, 'Raw text:', generatedText);
      // Try to extract intentions from text if JSON parsing fails
      intentions = ["Try again - the AI response couldn't be parsed"];
    }
    
    // Validate we have 3 intentions
    if (!Array.isArray(intentions) || intentions.length === 0) {
      console.error('Invalid intentions array:', intentions);
      intentions = ["Please try generating again"];
    }

    return new Response(JSON.stringify({ intentions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-intentions function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
