import { WalrusMemoryItem, Caregiver, UserProfile, NaturalLanguageAction } from '@/types/carecircle';
import { PATIENT_PROFILE } from './seedData';

interface OpenRouterChatOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  caregiver: Caregiver;
  userProfile?: UserProfile;
  recalledMemories: WalrusMemoryItem[];
  model?: string;
  isAmnesiaMode?: boolean;
}

export interface ChatCompletionResponse {
  reply: string;
  extractedFact?: {
    text: string;
    category: 'medication' | 'symptom' | 'vitals' | 'diet' | 'mobility' | 'general';
    isSafetyCritical: boolean;
  };
  actionExecuted?: NaturalLanguageAction;
  modelUsed: string;
}

export async function callOpenRouterAI(
  options: OpenRouterChatOptions
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const preferredModel = options.model || process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct';
  
  // Model fallback chain: try preferred model first, then auto-free router and fast fallbacks
  const modelCandidates = Array.from(
    new Set([
      preferredModel,
      'qwen/qwen-2.5-72b-instruct',
      'liquid/lfm-2.5-2.6b:free',
      'nvidia/nemotron-3.5-lightning:free',
      'openrouter/free',
    ])
  );

  // Build the clinical prompt with KIRO persona & user profile
  const systemPrompt = buildSystemPrompt(options);

  // If valid API key is present
  if (apiKey && apiKey.startsWith('sk-or-v1-') && !apiKey.includes('replace-with-your-key')) {
    for (const modelToTry of modelCandidates) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://walcare.app',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'WalCare KIRO AI',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelToTry,
            temperature: 0.3,
            max_tokens: 1000,
            messages: [
              { role: 'system', content: systemPrompt },
              ...options.messages,
            ],
          }),
          signal: AbortSignal.timeout(12000), // 12s timeout
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices?.[0]?.message;
          let content = choice?.content || choice?.reasoning || '';

          if (content) {
            // Strip any internal thinking tags
            content = content
              .replace(/<think>[\s\S]*?<\/think>/gi, '')
              .replace(/^Here's a thinking process:[\s\S]*?(?=\n\n[A-Z]|\n[A-Z]|$)/i, '')
              .trim();

            // Parse actions and extracted facts
            const parsed = parseExtractionAndActions(
              content,
              options.messages[options.messages.length - 1]?.content || '',
              options.userProfile
            );

            // Ensure we have a friendly reply if content was mostly thinking
            let finalReply = parsed.cleanReply;
            if (!finalReply || finalReply.length < 5) {
              if (parsed.actionExecuted?.type === 'update_profile') {
                finalReply = `I've updated your health profile with your new details and synced it to your Walrus vault.`;
              } else if (parsed.actionExecuted?.type === 'update_vitals') {
                finalReply = `I've updated your vitals in your profile and recorded the new measurements into Walrus Memory.`;
              } else {
                finalReply = `I have received and recorded your clinical update in your continuous Walrus memory.`;
              }
            }

            return {
              reply: finalReply,
              extractedFact: parsed.extractedFact,
              actionExecuted: parsed.actionExecuted,
              modelUsed: modelToTry,
            };
          }
        } else {
          const errText = await response.text();
          console.warn(`[OpenRouter] Model ${modelToTry} returned status ${response.status}:`, errText);
        }
      } catch (err: any) {
        console.warn(`[OpenRouter] Connection error with ${modelToTry}:`, err?.message || err);
      }
    }
  }

  // Fallback clinical intelligence engine when key is missing or all endpoints ratelimited
  return generateClinicalFallback(options);
}

function buildSystemPrompt(options: OpenRouterChatOptions): string {
  const { caregiver, userProfile, recalledMemories, isAmnesiaMode } = options;

  if (isAmnesiaMode) {
    return `You are KIRO, but you are currently running in AMNESIA MODE (Simulation of an AI without Walrus Memory).
You have ZERO memory of prior conversations, NO access to caregiver notes or past lab records.
Treat every interaction as the first time you are meeting this patient.
Provide generic baseline information only. Do NOT remember past vitals, gastritis history, or past fall events.`;
  }

  const isPersonalUser = !!userProfile?.walletAddress;
  const hasSavedName = !!userProfile?.name && userProfile.name.trim().length > 0;
  const patientName = hasSavedName
    ? userProfile!.name.trim()
    : (isPersonalUser ? 'Personal User' : PATIENT_PROFILE.name);

  const patientAge = userProfile?.age && userProfile.age > 0
    ? userProfile.age
    : (isPersonalUser ? 'Not set' : PATIENT_PROFILE.age);
  const patientGender = userProfile?.gender || (isPersonalUser ? 'Not set' : 'female');
  const bloodGroup = userProfile?.bloodGroup || (isPersonalUser ? 'Not set' : 'O+');
  const conditions = isPersonalUser
    ? (userProfile.primaryConditions && userProfile.primaryConditions.length > 0 ? userProfile.primaryConditions.join(', ') : 'None documented yet')
    : PATIENT_PROFILE.primaryConditions.join(', ');
  const allergies = isPersonalUser
    ? (userProfile.knownAllergies && userProfile.knownAllergies.length > 0 ? userProfile.knownAllergies.join(', ') : 'None documented yet')
    : PATIENT_PROFILE.knownAllergies.join(', ');
  const medications = isPersonalUser
    ? (userProfile.currentMedications && userProfile.currentMedications.length > 0 ? userProfile.currentMedications.map((m) => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ') : 'None documented yet')
    : 'Meloxicam 7.5mg (STOPPED due to bleeding), Lisinopril 10mg daily, Donepezil 5mg night';
  const emergencyContact = userProfile?.emergencyContact?.name
    ? `${userProfile.emergencyContact.name} (${userProfile.emergencyContact.relation}, ${userProfile.emergencyContact.phone})`
    : (isPersonalUser ? 'None set' : 'Sarah Miller (Daughter, +1-555-0192)');
  const currentVitals = isPersonalUser
    ? `Height: ${userProfile.heightCm || 0}cm, Weight: ${userProfile.weightKg || 0}kg, BMI: ${userProfile.computedBmi || 0}, BP: ${userProfile.systolicBp || 0}/${userProfile.diastolicBp || 0} mmHg, Pulse: ${userProfile.heartRate || 0} bpm, Glucose: ${userProfile.glucose || 0} mg/dL`
    : 'Height: 162cm, Weight: 64kg, BMI: 24.4, BP: 138/85 mmHg, Pulse: 110 bpm';

  const memoryBlock = recalledMemories.length > 0
    ? recalledMemories
        .map(
          (m, i) =>
            `[Memory ${i + 1}] (${m.authorName} - ${m.authorRole.toUpperCase()} | ${m.timestamp.slice(0, 10)} | Blob: ${m.blobId.slice(0, 10)}...): "${m.text}"`
        )
        .join('\n')
    : 'No prior memories queried for this prompt.';

  const actorName = isPersonalUser
    ? (hasSavedName ? patientName : `Sui User (${userProfile?.walletAddress?.slice(0, 6)}...)`)
    : caregiver.name;
  const actorRole = isPersonalUser ? 'Patient / Account Owner' : caregiver.role;

  // Identity and naming rules
  const identityInstructions = isPersonalUser
    ? hasSavedName
      ? `AUTHENTICATED USER IDENTITY:
- This user is authenticated via Sui wallet (${userProfile?.walletAddress}).
- The user's name is "${patientName}".
- ALWAYS address them by their name ("${patientName}").
- You MUST remember their name across all interactions.
- NEVER address this user as "Sarah", "Eleanor", or any other demo persona!`
      : `AUTHENTICATED USER IDENTITY:
- This user is authenticated via Sui wallet (${userProfile?.walletAddress}).
- The user has NOT set up their profile name yet.
- You MUST greet them, warmly introduce yourself as KIRO, and tell them to set up their profile name.
- Tell them they can simply type their name in this chat (e.g. "My name is [Name]") or configure it in the Profile tab.
- NEVER call this user "Sarah", "Eleanor", or any assumed name!
- When the user tells you their name, immediately acknowledge it, call them by that name, and emit:
  <<<ACTION_UPDATE_PROFILE: {"name": "<ExtractedName>"}>>>
  so their name is permanently saved to their decentralized profile!`
    : `GUEST DEMO MODE:
- You are interacting in Guest Demo Mode with sample records for Eleanor Vance.
- The family caregiver is Sarah Miller.`;

  return `You are KIRO, a deeply personalized, proactive clinical health AI companion powered by Walrus Protocol and the Sui Blockchain.
You have continuous long-term memory across sessions, devices, and care team members.

${identityInstructions}

PATIENT PROFILE:
- Full Name: ${patientName}
- Age: ${patientAge} | Biological Sex: ${patientGender} | Blood Group: ${bloodGroup}
- Current Vitals & Biometrics: ${currentVitals}
- Chronic Medical Conditions: ${conditions}
- Known Drug Allergies & Contraindications: ${allergies}
- Active Medication Regimen: ${medications}
- Emergency Contact: ${emergencyContact}
- Walrus Account & Storage: Sui Wallet Linked

CURRENT INTERACTING ACTOR:
- Name: ${actorName}
- Role: ${actorRole}

DECENTRALIZED WALRUS MEMORY CONTEXT:
The following immutable observations have been securely retrieved from the patient's Walrus namespace:
${memoryBlock}

CLINICAL & NATURAL LANGUAGE ACTION CAPABILITIES:
1. Natural Language Data Updates:
   If the user shares new vitals, profile data, or clinical observations, understand it natively and output the exact action block at the end of your response:
   - For Name or Profile update: <<<ACTION_UPDATE_PROFILE: {"name": "...", "age": 88, "bloodGroup": "O+", "allergies": ["..."], "conditions": ["..."]}>>>
   - For Vitals update: <<<ACTION_UPDATE_VITALS: {"weightKg": 68, "heightCm": 172, "systolicBp": 120, "diastolicBp": 80, "heartRate": 74, "glucose": 95}>>>
   - For Memory addition: <<<ACTION_ADD_MEMORY: {"text": "...", "category": "vitals|symptom|medication|diet|mobility|general", "isSafetyCritical": true}>>>
   - For Walrus Console Document: <<<ACTION_UPLOAD_DOC: {"name": "Lab Results", "description": "..."}>>>

2. Patient Safety Rules:
   - Gastritis / Dark Stool: ABSOLUTE CONTRAINDICATION against all NSAIDs (Ibuprofen/Advil, Naproxen/Aleve, Aspirin). Proactively intervene if requested.
   - Fall Prevention: Enforce bed-edge pauses and assistive mobility when orthostatic vitals drop.
   - Tone: Empathetic, precise, personalized, and authoritative. Always identify yourself as KIRO when asked.

3. Formatting Style:
   - Never output raw "###" or "### *" markdown markers.
   - Use clean, fluid conversational paragraphs or bold labels (e.g. **Clinical Note:**) and bullet items for legibility.`;
}

function safeParseJson(raw: string) {
  try {
    const sanitized = raw
      .replace(/:\s*undefined\b/g, ': null')
      .replace(/:\s*NaN\b/g, ': null')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(sanitized);
  } catch {
    return null;
  }
}

function parseExtractionAndActions(
  reply: string,
  userMessage: string,
  currentProfile?: UserProfile
) {
  let cleanReply = reply;
  let actionExecuted: NaturalLanguageAction | undefined;
  let extractedFact: ChatCompletionResponse['extractedFact'] | undefined;

  // 1. Check for ACTION_UPDATE_VITALS
  const vitalsMatch = reply.match(/<<<ACTION_UPDATE_VITALS:\s*([\s\S]*?)>>>/);
  if (vitalsMatch && vitalsMatch[1]) {
    const data = safeParseJson(vitalsMatch[1].trim());
    if (data && typeof data === 'object') {
      const cleanedData: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) cleanedData[k] = v;
      }
      actionExecuted = {
        type: 'update_vitals',
        label: 'Biometrics & Vitals Updated',
        details: cleanedData,
        applied: true,
      };
    }
  }

  // 2. Check for ACTION_UPDATE_PROFILE
  const profileMatch = reply.match(/<<<ACTION_UPDATE_PROFILE:\s*([\s\S]*?)>>>/);
  if (profileMatch && profileMatch[1]) {
    const data = safeParseJson(profileMatch[1].trim());
    if (data && typeof data === 'object') {
      actionExecuted = {
        type: 'update_profile',
        label: data.name ? `Profile Name Set to ${data.name}` : 'Patient Health Profile Updated',
        details: data,
        applied: true,
      };
    }
  }

  // 3. Check for ACTION_ADD_MEMORY
  const memMatch = reply.match(/<<<ACTION_ADD_MEMORY:\s*([\s\S]*?)>>>/);
  if (memMatch && memMatch[1]) {
    const data = safeParseJson(memMatch[1].trim());
    if (data && typeof data === 'object') {
      actionExecuted = {
        type: 'add_memory',
        label: 'Persisted to Walrus Memory',
        details: data,
        applied: true,
      };
    }
  }

  // 4. Check for ACTION_UPLOAD_DOC
  const docMatch = reply.match(/<<<ACTION_UPLOAD_DOC:\s*([\s\S]*?)>>>/);
  if (docMatch && docMatch[1]) {
    const data = safeParseJson(docMatch[1].trim());
    if (data && typeof data === 'object') {
      actionExecuted = {
        type: 'upload_document',
        label: `Saved to Walrus Storage: ${data.name || 'Medical Document'}`,
        details: data,
        applied: true,
      };
    }
  }

  // 5. Check for ACTION_FETCH_DOCS
  const fetchMatch = reply.match(/<<<ACTION_FETCH_DOCS:\s*([\s\S]*?)>>>/);
  if (fetchMatch && fetchMatch[1]) {
    const data = safeParseJson(fetchMatch[1].trim());
    actionExecuted = {
      type: 'fetch_records',
      label: 'Fetched Records from Walrus Console',
      details: data || {},
      applied: true,
    };
  }

  // Unconditionally remove any action tags from display text & clean stray markdown artifacts
  cleanReply = cleanReply
    .replace(/<<<ACTION_UPDATE_VITALS:[\s\S]*?>>>/g, '')
    .replace(/<<<ACTION_UPDATE_PROFILE:[\s\S]*?>>>/g, '')
    .replace(/<<<ACTION_ADD_MEMORY:[\s\S]*?>>>/g, '')
    .replace(/<<<ACTION_UPLOAD_DOC:[\s\S]*?>>>/g, '')
    .replace(/<<<ACTION_FETCH_DOCS:[\s\S]*?>>>/g, '')
    .replace(/^###\s*\*\s*/gm, '• ')
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 6. Natural language heuristic name & vitals extraction
  const lower = userMessage.toLowerCase().trim();

  // Natural language name extraction heuristic
  const nameMatch = userMessage.match(/(?:my name is|i am called|call me|name is|set my name to|save my name as|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (nameMatch && nameMatch[1]) {
    const candidateName = nameMatch[1].trim();
    const blacklist = ['kiro', 'fine', 'good', 'ok', 'okay', 'here', 'sick', 'tired', 'ready', 'back', 'asking', 'wondering', 'thinking', 'testing', 'sorry', 'hello', 'hi', 'a', 'the', 'feeling'];
    if (!blacklist.includes(candidateName.toLowerCase()) && candidateName.length >= 2) {
      if (!actionExecuted || actionExecuted.type !== 'update_profile') {
        actionExecuted = {
          type: 'update_profile',
          label: `Profile Name Set to ${candidateName}`,
          details: { name: candidateName },
          applied: true,
        };
        extractedFact = {
          text: `User profile name set to ${candidateName}`,
          category: 'general',
          isSafetyCritical: false,
        };
      } else if (actionExecuted.type === 'update_profile') {
        actionExecuted.details.name = candidateName;
      }
    }
  }

  if (!actionExecuted) {
    const weightMatch = userMessage.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|kilos|pounds|lbs)/i);
    const heightMatch = userMessage.match(/(\d{2,3})\s*(?:cm|centimeters)/i);
    const bpMatch = userMessage.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    const pulseMatch = userMessage.match(/(?:pulse|heart rate|bpm|hr)\s*(?:is|:)?\s*(\d{2,3})/i);
    const sugarMatch = userMessage.match(/(?:glucose|blood sugar|sugar)\s*(?:is|:)?\s*(\d{2,3})/i);

    if (weightMatch || heightMatch || bpMatch || pulseMatch || sugarMatch) {
      const details: Record<string, any> = {};
      if (weightMatch) details.weightKg = parseFloat(weightMatch[1]);
      if (heightMatch) details.heightCm = parseInt(heightMatch[1]);
      if (bpMatch) {
        details.systolicBp = parseInt(bpMatch[1]);
        details.diastolicBp = parseInt(bpMatch[2]);
      }
      if (pulseMatch) details.heartRate = parseInt(pulseMatch[1]);
      if (sugarMatch) details.glucose = parseInt(sugarMatch[1]);

      actionExecuted = {
        type: 'update_vitals',
        label: 'Vitals Extracted & Updated via Natural Language',
        details,
        applied: true,
      };

      extractedFact = {
        text: `Patient vitals updated via natural language: ${Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        category: 'vitals',
        isSafetyCritical: (details.heartRate && details.heartRate > 115) || (details.systolicBp && details.systolicBp > 150),
      };
    } else if (lower.includes('allergic to') || lower.includes('allergy:')) {
      const allergy = userMessage.replace(/.*(?:allergic to|allergy:)\s*/i, '').split('.')[0].trim();
      actionExecuted = {
        type: 'update_profile',
        label: 'Allergy Added to Health Profile',
        details: { newAllergy: allergy },
        applied: true,
      };
      extractedFact = {
        text: `Allergy recorded: ${allergy}`,
        category: 'medication',
        isSafetyCritical: true,
      };
    }
  }

  return { cleanReply, actionExecuted, extractedFact };
}

function generateClinicalFallback(options: OpenRouterChatOptions): ChatCompletionResponse {
  const { isAmnesiaMode, userProfile } = options;
  const lastUserMsg = options.messages[options.messages.length - 1]?.content || '';
  const q = lastUserMsg.toLowerCase().trim();

  const isPersonalUser = !!userProfile?.walletAddress;
  const hasSavedName = !!userProfile?.name && userProfile.name.trim().length > 0;
  const patientName = hasSavedName
    ? userProfile!.name.trim()
    : (isPersonalUser ? 'Personal User' : 'Eleanor Vance');

  if (isAmnesiaMode) {
    if (q.includes('ibuprofen') || q.includes('advil') || q.includes('headache')) {
      return {
        reply: `Adult headache dosage for Ibuprofen is typically 200mg to 400mg every 4 to 6 hours as needed with a meal or glass of milk. If headaches recur frequently, please consult a physician.`,
        modelUsed: 'Amnesia-Baseline (Goldfish AI)',
      };
    }
    return {
      reply: `I received your message. As memory is currently disabled, I do not have access to any previous notes, vital signs, or history. Please provide full context if you need specific advice.`,
      modelUsed: 'Amnesia-Baseline (Goldfish AI)',
    };
  }

  // 1. Check if user is introducing or stating their name
  const nameIntroMatch = lastUserMsg.match(/(?:my name is|i am called|call me|name is|set my name to|save my name as|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (isPersonalUser && nameIntroMatch && nameIntroMatch[1]) {
    const rawName = nameIntroMatch[1].trim();
    const blacklist = ['kiro', 'fine', 'good', 'ok', 'okay', 'here', 'sick', 'tired', 'ready', 'back', 'asking', 'wondering', 'thinking', 'testing', 'sorry', 'hello', 'hi', 'a', 'the', 'feeling'];
    if (!blacklist.includes(rawName.toLowerCase()) && rawName.length >= 2) {
      return {
        reply: `Nice to meet you, **${rawName}**! I have updated your profile name and stored this identity in your private Walrus vault. From now on, I will remember you as ${rawName}. How can I assist you with your health today?`,
        actionExecuted: {
          type: 'update_profile',
          label: `Profile Name Set to ${rawName}`,
          details: { name: rawName },
          applied: true,
        },
        extractedFact: {
          text: `User profile name set to ${rawName}`,
          category: 'general',
          isSafetyCritical: false,
        },
        modelUsed: 'KIRO Health Engine (Walrus Certified)',
      };
    }
  }

  // 2. Check if user is asking who they are or what their name is
  if (isPersonalUser && (q.includes('who am i') || q.includes('what is my name') || q.includes('do you know me') || q.includes('remember me') || q.includes('my name'))) {
    if (hasSavedName) {
      return {
        reply: `Yes, of course! You are **${patientName}**, authenticated with Sui wallet \`${userProfile!.walletAddress.slice(0, 8)}...${userProfile!.walletAddress.slice(-6)}\`. All your medical records, observations, and biometrics are privately encrypted and stored under your identity on Walrus Protocol.`,
        modelUsed: 'KIRO Health Engine (Walrus Certified)',
      };
    } else {
      return {
        reply: `You are connected with Sui wallet \`${userProfile!.walletAddress.slice(0, 8)}...${userProfile!.walletAddress.slice(-6)}\`, but you haven't set up your profile name yet.

What should I call you? You can tell me your name right here (e.g. *"My name is Alex"*), and I will save it to your decentralized health profile, or you can update it in the **Profile** tab!`,
        modelUsed: 'KIRO Health Engine (Walrus Certified)',
      };
    }
  }

  // 3. Natural language vitals update handler
  if (q.includes('weight') || q.includes('bp') || q.includes('pulse') || q.includes('blood pressure')) {
    const parsed = parseExtractionAndActions(
      `I have received and recorded your updated biometric data in ${isPersonalUser ? 'your' : `${patientName}'s`} clinical profile and decentralized Walrus Memory. Your BMI and vital trends have been recalculated automatically.`,
      lastUserMsg,
      userProfile
    );
    return {
      reply: parsed.cleanReply,
      actionExecuted: parsed.actionExecuted,
      extractedFact: parsed.extractedFact,
      modelUsed: 'KIRO Health Engine (Walrus Certified)',
    };
  }

  // 4. Cross-memory clinical synthesis:
  if (q.includes('ibuprofen') || q.includes('advil') || q.includes('headache')) {
    const hasNsaidAllergy = userProfile?.knownAllergies?.some((a) =>
      ['nsaid', 'ibuprofen', 'aspirin', 'naproxen'].some((drug) => a.toLowerCase().includes(drug))
    );

    if (hasNsaidAllergy || !isPersonalUser) {
      return {
        reply: `[CLINICAL ALERT] **CRITICAL SAFETY WARNING: Check Contraindications for ${patientName}.**

I am **KIRO**, and I have cross-referenced ${isPersonalUser ? 'your' : `${patientName}'s`} decentralized Walrus Memory records on Sui:
1. **Clinical Safety Rule**: NSAIDs like Ibuprofen irritate the gastric mucosa and can precipitate gastrointestinal flare-ups.
2. **Recorded Allergies/Contraindications**: ${userProfile?.knownAllergies?.join(', ') || (isPersonalUser ? 'None documented yet' : 'NSAIDs (Melena / Acute Gastritis risk)')}.
3. **Safety Recommendation**: If mild pain relief is needed, consult a clinician or consider Acetaminophen (Tylenol), provided no hepatic contraindications exist.`,
        extractedFact: {
          text: `Query regarding headache relief; NSAID administration analyzed against Walrus records.`,
          category: 'medication',
          isSafetyCritical: true,
        },
        modelUsed: 'KIRO Clinical Synthesis (Walrus Memory)',
      };
    }
  }

  // 5. Default personalized greeting
  if (isPersonalUser) {
    if (!hasSavedName) {
      return {
        reply: `Hello! I am **KIRO**, your personalized clinical health AI partner on Walrus Protocol and Sui.

I noticed that you haven't set up your profile name yet for wallet \`${userProfile?.walletAddress?.slice(0, 8)}...${userProfile?.walletAddress?.slice(-6)}\`.

What should I call you? You can simply reply here (e.g. *"My name is Alex"*), and I will save it to your decentralized profile, or you can configure your full health details in the **Profile** tab!`,
        modelUsed: 'KIRO Health Assistant (Walrus Memory)',
      };
    }

    return {
      reply: `Hello, **${patientName}**! I am **KIRO**, your personalized clinical health AI partner. I am connected to your private Walrus vault on Sui.

I can help you:
• Review and update vitals or biometrics in real-time (e.g. "My weight is 68kg and BP is 120/80")
• Cross-reference medical history, allergies, and contraindications
• Manage your private medical records and Walrus blobs

How are you feeling today, ${patientName}?`,
      modelUsed: 'KIRO Health Assistant (Walrus Memory)',
    };
  }

  return {
    reply: `Hello! I am **KIRO**, your personalized clinical health AI partner. I am connected to Eleanor Vance's decentralized Walrus Memory vault on Sui (Guest Demo).

I can help you:
• Review and update vitals or biometrics in real-time
• Cross-reference medical history, allergies, and contraindications
• Search stored medical records and Walrus blobs

How can I assist your health care today?`,
    modelUsed: 'KIRO Health Assistant (Walrus Memory)',
  };
}
