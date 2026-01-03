import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, topic, studentLevel, weakAreas, strongAreas } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Generating adaptive quiz for topic:", topic);
    console.log("Student level:", studentLevel);
    console.log("Weak areas:", weakAreas);
    console.log("Strong areas:", strongAreas);
    console.log("Chat messages count:", messages?.length || 0);

    // Build context from chat messages
    const chatContext = messages
      ?.filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
      .map((m: ChatMessage) => `${m.role}: ${m.content}`)
      .join("\n")
      .slice(-4000); // Limit context size

    const weakAreasText = weakAreas?.length > 0 ? weakAreas.join(", ") : "None identified";
    const strongAreasText = strongAreas?.length > 0 ? strongAreas.join(", ") : "None identified";

    const systemPrompt = `You are an adaptive quiz generator for Indian students. Generate PERSONALIZED quiz questions based on the study session.

ADAPTIVE LEARNING APPROACH:
- Focus 60% questions on WEAK AREAS to help student improve: ${weakAreasText}
- Include 20% questions on STRONG AREAS to build confidence: ${strongAreasText}
- Add 20% new challenging questions to extend learning

IMPORTANT RULES:
1. Generate exactly 5 questions (short, focused quiz)
2. Questions should be based on what was discussed in the chat
3. Mix question types: MCQ (60%), True/False (20%), Short answer (20%)
4. Difficulty should match student's level: ${studentLevel || "average"}
   - If weak: Start with easier questions, build up
   - If average: Mix of easy and medium
   - If good/excellent: More challenging questions
5. Questions should test UNDERSTANDING, not just memory
6. Use simple Hinglish - like talking to a friend
7. Make questions relevant and practical

QUESTION STYLE EXAMPLES:
- WRONG: "What is the formula for velocity?"
- RIGHT: "Agar ek car 100km 2 hours mein travel karti hai, toh uski speed kya hogi?"

- WRONG: "Define photosynthesis"
- RIGHT: "Plants ko sunlight kyun chahiye? Iska kya faayda hai?"

OUTPUT FORMAT (strictly JSON):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq" | "true_false" | "short_answer",
      "question": "Question in simple Hinglish",
      "options": ["A", "B", "C", "D"] (only for mcq),
      "correct_answer": "The correct answer",
      "explanation": "Simple explanation in Hinglish - like talking to a friend",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "Specific topic being tested",
      "targets_weak_area": true | false
    }
  ],
  "total_questions": 5,
  "adaptive_focus": "Description of how quiz adapts to student needs"
}

STUDY SESSION CONTEXT:
${chatContext || "General study session on " + (topic || "various topics")}

Generate 5 adaptive questions that will help this student learn better.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate quiz questions for the study session on "${topic || 'General Study'}". The student's understanding level is ${studentLevel || 'average'}.` }
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("No response content from AI:", data);
      throw new Error("No response from AI");
    }

    console.log("Quiz generation response received");

    // Extract JSON from response
    let quizData;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse quiz JSON:", e);
      // Generate fallback questions
      quizData = {
        questions: [
          {
            id: 1,
            type: "mcq",
            question: `${topic || "Is session"} ke baare mein sabse important point kya hai?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: "Option A",
            explanation: "Ye session ka main concept hai.",
            difficulty: "medium",
            topic: topic || "General"
          }
        ],
        total_questions: 1,
        topics_covered: [topic || "General"],
        difficulty_distribution: { easy: 0, medium: 1, hard: 0 }
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        quiz: quizData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An error occurred",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});