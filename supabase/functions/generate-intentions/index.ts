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

    const systemPrompt = `You are an expert life coach who creates powerful daily intentions based on a user's personal mission.
Generate exactly 3 creative, purposeful intentions that have BOTH a clear purpose AND a clear means of achieving it.

WHAT MAKES A GREAT INTENTION:
- It combines PURPOSE (why) with ACTION (how) in a single statement
- It can be practiced CONTINUOUSLY throughout the day in various situations
- It's a behavioral pattern or mindset, NOT a one-time task
- It's specific enough to be actionable but universal enough to apply in many moments
- It transforms ordinary interactions and tasks into meaningful practices

EXCELLENT EXAMPLES (study these patterns):
- "Make sure everyone you talk to feels valued and respected" (purpose: honor others, action: in every conversation)
- "Live the day without fear of negative judgement" (purpose: freedom, action: release worry in each moment)
- "Keep a straight and confident posture" (purpose: confidence, action: physical awareness)
- "Notice what makes you smile" (purpose: gratitude, action: active observation)
- "Create a plan for the day and stick to it" (purpose: discipline, action: commitment to structure)
- "Notice others' emotions and respond to them" (purpose: empathy, action: attentive presence)
- "Treat every task with maximum focus" (purpose: excellence, action: deliberate attention)
- "Radiate positivity and joy in every interaction" (purpose: uplift others, action: conscious energy)
- "Empower others by showing you have faith and confidence in them" (purpose: inspire growth, action: express belief)

AVOID THESE WEAK PATTERNS:
- Vague statements like "Be more mindful" or "Stay positive" (no clear action)
- One-time tasks like "Try something new" or "Learn a skill" (not repeatable)
- Situation-specific like "Handle stress better at work" (too narrow)
- Generic advice like "Take care of yourself" (not actionable)

Each intention should feel like a personal challenge that transforms how the user moves through their entire day.

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
