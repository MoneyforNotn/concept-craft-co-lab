import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callOpenAIWithRetry(apiKey: string, prompt: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`OpenAI API call attempt ${attempt + 1}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a thoughtful guide helping people discover their personal mission. Generate authentic, inspiring mission statements.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
        }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Handle temporary server errors
      if (response.status >= 500 && response.status < 600) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Server error ${response.status}. Waiting ${waitTime}ms before retry...`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error('OpenAI service temporarily unavailable. Please try again later.');
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const personalMission = data.choices[0]?.message?.content;
      
      if (!personalMission) {
        throw new Error('No content generated from OpenAI');
      }

      return personalMission;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      // If it's not a retryable error, throw immediately
      const errorMessage = lastError.message;
      if (!errorMessage.includes('Rate limit') && !errorMessage.includes('temporarily unavailable') && !errorMessage.includes('ECONNRESET')) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${waitTime}ms before next retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Failed after all retry attempts');
}

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

    const personalMission = await callOpenAIWithRetry(OPENAI_API_KEY, prompt);
    
    console.log('Generated personal mission:', personalMission);

    return new Response(
      JSON.stringify({ personalMission }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-personal-mission function:', error);
    
    // Return user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('Rate limit') ? 429 : 
                       errorMessage.includes('temporarily unavailable') ? 503 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        retryable: errorMessage.includes('Rate limit') || errorMessage.includes('temporarily unavailable')
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
