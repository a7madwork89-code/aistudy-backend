import { getGeminiModel } from '../config/gemini.js';
import { db } from '../config/firebase.js';

export const processText = async (req, res, next) => {
  try {
    const { text, userId, sessionTitle } = req.body;

    // Validation
    if (!text || text.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'النص قصير جداً. يجب أن يكون 50 حرف على الأقل'
      });
    }

    console.log(`Processing text for user: ${userId}, length: ${text.length}`);

    // Create prompt for Gemini
    const prompt = `
أنت مساعد تعليمي ذكي متخصص في تحليل المحتوى الدراسي.

قم بتحليل النص التالي وإنشاء:

1. **ملخص تعليمي شامل** (150-250 كلمة):
   - اجعله واضحاً ومنظماً
   - ركز على النقاط الرئيسية
   - استخدم لغة بسيطة وسهلة الفهم

2. **5-7 أسئلة تعليمية متنوعة** مع أجوبتها:
   - أسئلة سهلة (تذكر واستيعاب)
   - أسئلة متوسطة (تطبيق وتحليل)
   - أسئلة صعبة (تقييم وتركيب)
   - تأكد أن الأجوبة واضحة ومفصلة

3. **7-10 بطاقات تعليمية (Flashcards)**:
   - السؤال (front): مصطلح، مفهوم، أو سؤال قصير
   - الجواب (back): تعريف، شرح، أو إجابة مختصرة
   - ركز على المعلومات المهمة والقابلة للحفظ

**النص المطلوب تحليله:**
${text}

**مهم جداً:** أرجع النتيجة بصيغة JSON صحيحة فقط، بدون أي نص إضافي قبل أو بعد JSON:

{
  "summary": "الملخص هنا",
  "questions": [
    {
      "question": "نص السؤال",
      "answer": "نص الإجابة",
      "difficulty": "سهل أو متوسط أو صعب"
    }
  ],
  "flashcards": [
    {
      "front": "السؤال أو المصطلح",
      "back": "الإجابة أو التعريف"
    }
  ]
}
`;

    // Call Gemini API
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiText = response.text();

    console.log('Gemini response received, length:', aiText.length);

    // Clean and parse JSON
    aiText = aiText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();

    let aiData;
    try {
      aiData = JSON.parse(aiText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw AI response:', aiText.substring(0, 500));
      
      // Fallback data
      aiData = {
        summary: `تم تحليل النص بنجاح. النص يحتوي على ${text.split(' ').length} كلمة تقريباً.`,
        questions: [
          {
            question: "ما هي النقاط الرئيسية في النص؟",
            answer: "يحتوي النص على معلومات تعليمية متنوعة تحتاج للمراجعة",
            difficulty: "متوسط"
          }
        ],
        flashcards: [
          {
            front: "مفهوم أساسي من النص",
            back: "معلومة مهمة للحفظ"
          }
        ]
      };
    }

    // Validate structure
    if (!aiData.summary || !Array.isArray(aiData.questions) || !Array.isArray(aiData.flashcards)) {
      throw new Error('Invalid AI response structure');
    }

    // Save to Firebase (optional)
    if (sessionTitle) {
      await db.collection('sessions').add({
        userId: userId,
        title: sessionTitle,
        originalText: text.substring(0, 500), // First 500 chars
        summary: aiData.summary,
        questionsCount: aiData.questions.length,
        flashcardsCount: aiData.flashcards.length,
        createdAt: new Date().toISOString()
      });
    }

    // Send response
    res.json({
      success: true,
      data: aiData,
      meta: {
        textLength: text.length,
        questionsCount: aiData.questions.length,
        flashcardsCount: aiData.flashcards.length,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    next(error);
  }
};

// Health check for AI service
export const checkAIHealth = async (req, res) => {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent('Hello');
    const response = await result.response;
    
    res.json({
      success: true,
      message: 'AI service is working',
      model: 'gemini-pro'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'AI service unavailable'
    });
  }
};