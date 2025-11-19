import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { responses } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Generating personal mission from responses:', responses);

    const prompt = `Based on the following responses to self-discovery questions, generate a concise and inspiring personal mission statement (2-3 sentences max). The mission should capture their core values, aspirations, and what they want to embody in life.

Responses:
${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}

Generate a personal mission that is:
- Authentic and personal
- Inspiring and actionable
- Focused on their values and goals
- Written in first person
- Concise (2-3 sentences maximum)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a thoughtful guide helping people discover their personal mission. Generate authentic, inspiring mission statements.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const personalMission = data.choices[0].message.content;

    console.log('Generated personal mission:', personalMission);

    return new Response(
      JSON.stringify({ personalMission }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-personal-mission function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
