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

    const systemPrompt = `Generate exactly 3 daily intentions based on the user's personal mission.

WHAT IS AN INTENTION:
An intention is a BEHAVIORAL REMINDER - a specific way of acting or thinking that can be practiced CONTINUOUSLY throughout the entire day. It reminds the user how to behave in alignment with their values.

REQUIRED STYLE - COPY THIS EXACTLY:
- "Make sure everyone you talk to feels valued and respected"
- "Live the day without fear of negative judgement"
- "Keep a straight and confident posture"
- "Notice what makes you smile"
- "Create a plan for the day and stick to it"
- "Notice others' emotions and respond to them"
- "Treat every task with maximum focus"
- "Radiate positivity and joy in every interaction"
- "Empower others by showing you have faith and confidence in them"

CRITICAL - DO NOT GENERATE THESE TYPES (THEY ARE WRONG):
❌ "Embrace every challenge as an opportunity" - too abstract, not a specific behavior
❌ "Share knowledge with someone" - one-time action, not continuous
❌ "Learn something new today" - completable task, not ongoing practice
❌ "Cultivate a sense of joy" - vague, not actionable
❌ "Seek out opportunities" - not a specific behavior to practice

CORRECT INTENTIONS ARE:
✓ Specific observable behaviors (posture, how you speak to people, focus level)
✓ Continuous practices that apply to EVERY interaction or task
✓ Written as direct instructions: "Keep...", "Notice...", "Treat every...", "Make sure..."
✓ Things you can remind yourself of repeatedly throughout the day

Return ONLY a JSON array: ["intention 1", "intention 2", "intention 3"]`;

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
