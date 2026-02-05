# NICOLA.AI Clone Studio - Implementation Plan

## Overview
Full 6-step AI clone pipeline running on Vercel with Next.js.

---

## STEP 1: Face Creation (Identity Foundation)

**Purpose:** Create high-quality, identity-accurate portrait from selfie.

**API:** Gemini API (`gemini-2.0-flash-exp`)

**Input:** User's selfie (Base64)

**Output:** 1 high-quality portrait image

**Prompt Template:**
```
A photorealistic 85mm f/1.4 RAW portrait of this exact person,
same identity, same hair, same proportions. Soft studio lighting,
clean background, high micro-detail with real skin texture and pores.
Preserve facial structure accurately.
```

**File:** `app/api/step1-face/route.js`

---

## STEP 2: Dataset Building (Visual Variety)

**Purpose:** Generate 10-20 images of same face in different poses, outfits, angles.

**API:** Gemini API

**Input:** Original selfie + variation prompts

**Output:** 10 varied images (different poses, environments)

**Variations:**
1. Front professional headshot
2. 3/4 angle casual
3. Side profile
4. Walking outdoors
5. Sitting at desk
6. Gesturing while talking
7. Arms crossed confident
8. Looking up inspired
9. Serious direct
10. Relaxed leaning

**File:** `app/api/step2-dataset/route.js`

---

## STEP 3: Upscale to 4K (Video-Ready Clarity)

**Purpose:** Enhance images to 4K quality for smooth video generation.

**API:** Gemini API (enhancement prompt)

**Input:** Generated images

**Output:** 4K enhanced images

**Prompt:**
```
Enhance this image to maximum quality. Increase sharpness,
improve skin texture detail, remove artifacts, maintain identity.
Output highest resolution possible.
```

**File:** `app/api/step3-upscale/route.js`

---

## STEP 4: Voice Clone (Authentic Presence)

**Purpose:** Generate Arabic speech from text.

**API:** Browser Web Speech API (free) or gTTS

**Input:** Arabic text script

**Output:** MP3 audio file

**Implementation:** Client-side using `speechSynthesis` API

**File:** Built into `app/page.js` (client-side)

---

## STEP 5: Motion Video (Human Realism)

**Purpose:** Animate still image into video with natural motion.

**API:** Google VEO via Gemini API

**Input:** Upscaled image + motion prompt

**Output:** MP4 video (5-10 seconds)

**Prompt Template:**
```json
{
  "description": "Cinematic portrait with subtle natural motion",
  "camera": "static with gentle drift",
  "lighting": "soft studio key light",
  "subject_behavior": {
    "movement": "natural breathing, subtle head motion, gentle blink"
  },
  "duration": "5 seconds"
}
```

**File:** `app/api/step5-motion/route.js`

---

## STEP 6: Final Assembly (Authority Content)

**Purpose:** Combine video + audio into final content.

**Implementation:**
- Option A: FFmpeg.wasm (browser-based)
- Option B: Download video + audio separately for manual assembly

**Output:** Final MP4 with voice

**File:** `app/api/step6-assembly/route.js` or client-side

---

## UI Flow

```
┌─────────────────────────────────────────────────┐
│           NICOLA.AI Clone Studio                │
├─────────────────────────────────────────────────┤
│  Step 1: Face Creation                          │
│  [Upload Selfie] → [Generate Portrait]          │
│  ○ ○ ○ ○ ○ ○  (progress dots)                   │
├─────────────────────────────────────────────────┤
│  Step 2: Dataset Building                       │
│  [Generate 10 Variations]                       │
│  [Grid of generated images]                     │
├─────────────────────────────────────────────────┤
│  Step 3: Upscale                                │
│  [Upscale All to 4K]                            │
├─────────────────────────────────────────────────┤
│  Step 4: Voice                                  │
│  [Enter Arabic Script] → [Generate Voice]       │
│  [Audio Player]                                 │
├─────────────────────────────────────────────────┤
│  Step 5: Motion Video                           │
│  [Select Image] → [Generate Video with VEO]     │
│  [Video Player]                                 │
├─────────────────────────────────────────────────┤
│  Step 6: Assembly                               │
│  [Combine Video + Audio]                        │
│  [Download Final Video]                         │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
ai_clone_studio_vercel/
├── app/
│   ├── page.js                    # Main UI with 6 steps
│   ├── layout.js                  # HTML wrapper
│   ├── globals.css                # Styles
│   └── api/
│       ├── step1-face/route.js    # Face creation
│       ├── step2-dataset/route.js # Dataset building
│       ├── step3-upscale/route.js # Upscaling
│       ├── step5-motion/route.js  # VEO video generation
│       └── step6-assembly/route.js# Final assembly
├── package.json
├── vercel.json
└── README.md
```

---

## API Keys Required

```
GEMINI_API_KEY=xxx     # For steps 1, 2, 3, 5
```

Voice (Step 4) uses browser API - no key needed.

---

## Implementation Order

1. ✅ Create PLAN.md (this file)
2. Create step1-face API
3. Create step2-dataset API
4. Create step3-upscale API
5. Add voice generation (client-side)
6. Create step5-motion API (VEO)
7. Create step6-assembly
8. Update page.js with full 6-step UI
9. Push to GitHub
10. Deploy to Vercel
