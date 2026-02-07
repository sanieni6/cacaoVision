# CacaoVision - Expo Mobile App Implementation Plan

> **Purpose**: Complete implementation guide for the CacaoVision Expo app.
> Execute this plan in a new repository separate from `tfm-model`.
> This plan references model specs from `tfm-model/docs/MODEL_EXPORT_GUIDE.md`.

---

## Table of Contents

1. [Context](#context)
2. [Model Specifications](#model-specifications)
3. [Phase 0: Project Scaffolding](#phase-0-project-scaffolding)
4. [Phase 1: Theme, Types, and Constants](#phase-1-theme-types-and-constants)
5. [Phase 2: Inference Engine](#phase-2-inference-engine)
6. [Phase 3: Navigation](#phase-3-navigation)
7. [Phase 4: Home Screen](#phase-4-home-screen)
8. [Phase 5: Detection Results Screen](#phase-5-detection-results-screen)
9. [Phase 6: About Screen](#phase-6-about-screen)
10. [Phase 7: Model Import and Dynamic Loading](#phase-7-model-import-and-dynamic-loading)
11. [Phase 8: Dev Build and Testing](#phase-8-dev-build-and-testing)
12. [Phase 9: Polish and Production](#phase-9-polish-and-production)
13. [Key Technical Decisions](#key-technical-decisions)
14. [Verification Checklist](#verification-checklist)

---

## Context

**CacaoVision** is a cross-platform Expo (TypeScript + React) mobile app for detecting diseases in cacao pods using on-device YOLO inference. Users capture or pick images from their phone, and the app runs inference locally using `onnxruntime-react-native` -- no server required.

### Requirements
1. Expo app for **iOS and Android**, name "CacaoVision", cacao-themed color palette
2. Use all available **Expo best practices** and skills for a modern, compatible app
3. Integrate `onnxruntime-react-native` for **ONNX model import** and `expo-camera`/`expo-image-picker` for image acquisition
4. **Photo capture or gallery pick** approach (not real-time video inference)
5. **Main screen**: header with app name, "Detectar Enfermedad" button, bottom sheet for camera/gallery selection, detection screen with bounding boxes and metrics
6. **About Us screen** with year, author, project description
7. **Dynamic model loading**: user can import `.onnx` model files from their device. App auto-detects model type (YOLO26n vs YOLO11n) by output tensor shape, with manual toggle as fallback
8. **Open source** project (MIT license)

---

## Model Specifications

Two YOLO models were trained for cacao disease detection. The app supports both dynamically:

### Classes
| Class ID | Label | Color | Description |
|----------|-------|-------|-------------|
| 0 | `healthy` | `#2ECC71` (green) | Healthy cacao pod |
| 1 | `moniliasis` | `#F39C12` (amber) | Frosty Pod Rot (*Moniliophthora roreri*) |
| 2 | `black_pod` | `#E74C3C` (red) | Black Pod disease (*Phytophthora palmivora*) |

### Input (same for both models)
| Property | Value |
|----------|-------|
| Shape | `[1, 3, 640, 640]` |
| Format | NCHW (batch, channels, height, width) |
| Data type | `float32` |
| Normalization | Pixel values / 255 (range 0.0 - 1.0) |
| Color space | RGB |

### YOLO26n Output (Recommended -- NMS built-in)
| Property | Value |
|----------|-------|
| Shape | `[1, 300, 6]` |
| Format | `[x1, y1, x2, y2, class_id, confidence]` per detection |
| Coordinates | Corner format in 640x640 space |
| NMS | Already applied inside the model |
| Padding | Unused slots have confidence ~0 |
| ONNX size | 9.35 MB |

### YOLO11n Output (Raw anchors -- requires NMS)
| Property | Value |
|----------|-------|
| Shape | `[1, 7, 8400]` |
| Format | `[cx, cy, w, h, score_c0, score_c1, score_c2]` per anchor |
| Coordinates | Center format in 640x640 space |
| NMS | Must be applied in app code (IoU 0.45) |
| ONNX size | 10.11 MB |

### Performance Comparison
| Metric | YOLO11n | YOLO26n |
|--------|---------|---------|
| mAP@0.5 | 0.9277 | 0.9202 |
| mAP@0.5:0.95 | 0.7032 | **0.7138** |
| Precision | 0.9117 | 0.9005 |
| Recall | 0.8652 | **0.8724** |

**YOLO26n is recommended** because: simpler postprocessing (~20 vs ~80 lines TS), smaller size, better recall (critical for disease detection), and NMS runs at native speed inside the model.

---

## Phase 0: Project Scaffolding

### 0.1 Create Expo project
```bash
npx create-expo-app@latest CacaoVision --template blank-typescript
cd CacaoVision
```

### 0.2 Install dependencies

**Core inference:**
```bash
npx expo install onnxruntime-react-native expo-asset
```

**Camera and image:**
```bash
npx expo install expo-camera expo-image-picker expo-file-system expo-document-picker
```

**Navigation:**
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
```

**UI:**
```bash
npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
npx expo install react-native-safe-area-context react-native-screens
npx expo install expo-splash-screen expo-image
```

**Styling (NativeWind v5 / Tailwind v4):**
```bash
npx expo install nativewind react-native-css
npm install -D tailwindcss@^4
```

> **Note**: `onnxruntime-react-native` includes native code, so the app requires a **dev build** (not Expo Go). Use `npx expo install expo-dev-client` and EAS Build.

### 0.3 Configuration files

#### `metro.config.js`
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add .onnx and .bin to asset extensions for model bundling
config.resolver.assetExts.push('onnx', 'bin');

module.exports = withNativeWind(config, { input: './global.css' });
```

#### `app.json`
```json
{
  "expo": {
    "name": "CacaoVision",
    "slug": "cacaovision",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "cacaovision",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#5D4037"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.cacaovision.app",
      "infoPlist": {
        "NSCameraUsageDescription": "CacaoVision needs camera access to capture photos for disease detection",
        "NSPhotoLibraryUsageDescription": "CacaoVision needs photo library access to select images for disease detection"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#5D4037"
      },
      "package": "com.cacaovision.app",
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        { "cameraPermission": "CacaoVision necesita acceso a la camara para detectar enfermedades" }
      ],
      [
        "expo-image-picker",
        { "photosPermission": "CacaoVision necesita acceso a tus fotos para analizar imagenes" }
      ],
      "expo-document-picker"
    ]
  }
}
```

#### `eas.json`
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

#### `tsconfig.json` additions
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### `global.css`
```css
@import "tailwindcss";
```

#### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cacao: {
          DEFAULT: '#5D4037',
          light: '#8B6B61',
          dark: '#3E2723',
          cream: '#FFF8E1',
        },
        healthy: '#2ECC71',
        moniliasis: '#F39C12',
        'black-pod': '#E74C3C',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 0.4 Project structure
```
CacaoVision/
  app/
    _layout.tsx              # Root layout (Stack + providers)
    (tabs)/
      _layout.tsx            # Tab layout (Home, About)
      index.tsx              # Home screen
      about.tsx              # About screen
    detection.tsx             # Detection results (stack screen)
  src/
    constants/
      colors.ts              # Cacao color palette
      classes.ts             # Class labels, colors, Spanish descriptions
      models.ts              # Model constants (input size, thresholds)
    types/
      detection.ts           # BoundingBox, Detection, ModelInfo, ModelType
      navigation.ts          # Route params
    inference/
      imageUtils.ts          # Preprocess image -> Float32Array NCHW
      postprocessing.ts      # YOLO26n parser (simple, ~30 lines)
      postprocessingYolo11n.ts  # YOLO11n parser + NMS (~80 lines)
      modelService.ts        # Load/run/unload ONNX session
      modelDetector.ts       # Auto-detect model type by output shape
    hooks/
      useModel.ts            # Model loading state management
      useDetection.ts        # Image -> detections pipeline
      useImagePicker.ts      # Camera/gallery image acquisition
    components/
      ImageSourceSheet.tsx    # Bottom sheet: camera vs gallery
      ModelStatusBadge.tsx    # Shows loaded model name + status
      DetectionOverlay.tsx    # Bounding boxes over image
      DetectionMetrics.tsx    # Confidence, class, count cards
      ModelSelector.tsx       # Import model + toggle model type
      EmptyState.tsx          # No model loaded state
  assets/
    images/                  # App icons, splash
    models/                  # Bundled default model (optional)
  global.css
  metro.config.js
  tailwind.config.ts
  eas.json
  app.json
  tsconfig.json
  LICENSE                    # MIT
  README.md
```

---

## Phase 1: Theme, Types, and Constants

### `src/constants/colors.ts`
```typescript
export const CACAO_COLORS = {
  // Primary palette
  primary: '#5D4037',       // Deep brown (cacao pod)
  primaryLight: '#8B6B61',  // Light brown
  primaryDark: '#3E2723',   // Dark chocolate

  // Secondary
  secondary: '#4CAF50',     // Warm green (growth)
  accent: '#FF8F00',        // Amber (alert)

  // Backgrounds
  background: '#FFF8E1',    // Cream
  surface: '#FFFFFF',
  surfaceVariant: '#F5F0EB',

  // Text
  text: '#3E2723',
  textSecondary: '#6D4C41',
  textOnPrimary: '#FFFFFF',

  // Status
  error: '#E74C3C',
  success: '#2ECC71',
  warning: '#F39C12',
} as const;
```

### `src/constants/classes.ts`
```typescript
export const CLASS_LABELS: Record<number, string> = {
  0: 'healthy',
  1: 'moniliasis',
  2: 'black_pod',
};

export const CLASS_LABELS_ES: Record<number, string> = {
  0: 'Saludable',
  1: 'Moniliasis',
  2: 'Mazorca Negra',
};

export const CLASS_COLORS: Record<string, string> = {
  healthy: '#2ECC71',
  moniliasis: '#F39C12',
  black_pod: '#E74C3C',
};

export const CLASS_DESCRIPTIONS_ES: Record<string, string> = {
  healthy: 'Mazorca de cacao en estado saludable',
  moniliasis: 'Pudricion helada causada por Moniliophthora roreri',
  black_pod: 'Mazorca negra causada por Phytophthora palmivora',
};

export const NUM_CLASSES = 3;
```

### `src/constants/models.ts`
```typescript
export const INPUT_SIZE = 640;
export const CHANNELS = 3;
export const CONFIDENCE_THRESHOLD = 0.25;
export const IOU_THRESHOLD = 0.45; // Only used for YOLO11n NMS

export const MODEL_TYPES = {
  YOLO26N: 'yolo26n',
  YOLO11N: 'yolo11n',
  UNKNOWN: 'unknown',
} as const;
```

### `src/types/detection.ts`
```typescript
export interface BoundingBox {
  x1: number;  // top-left x (original image coords)
  y1: number;  // top-left y
  x2: number;  // bottom-right x
  y2: number;  // bottom-right y
}

export interface Detection {
  box: BoundingBox;
  confidence: number;
  classId: number;
  className: string;
  classNameEs: string;
}

export type ModelType = 'yolo26n' | 'yolo11n' | 'unknown';

export interface ModelInfo {
  uri: string;
  type: ModelType;
  fileName: string;
  fileSize?: number;
  loadedAt: Date;
}

export interface DetectionResult {
  detections: Detection[];
  processingTimeMs: number;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  modelType: ModelType;
}
```

---

## Phase 2: Inference Engine

### 2.1 `src/inference/imageUtils.ts`

**Responsibility**: Convert an image URI into a Float32Array ready for ONNX inference.

```typescript
/**
 * Preprocess an image for YOLO inference.
 *
 * 1. Read the image from URI
 * 2. Resize to 640x640 (letterbox or stretch)
 * 3. Convert to Float32Array in NCHW format, normalized 0-1
 *
 * Returns { inputTensor: Float32Array, originalWidth, originalHeight }
 */
export async function preprocessImage(
  imageUri: string,
  inputSize: number
): Promise<{
  inputTensor: Float32Array;
  originalWidth: number;
  originalHeight: number;
}>
```

Implementation approach:
- Use `expo-image-manipulator` to resize the image to 640x640
- Read pixel data (may need a canvas approach or `expo-gl` for raw pixel access)
- Convert HWC uint8 RGB -> CHW float32 normalized
- Alternative: Use a `WebView` with canvas for pixel extraction if native pixel access is limited

### 2.2 `src/inference/postprocessing.ts` (YOLO26n)

```typescript
/**
 * Parse YOLO26n end-to-end output: [1, 300, 6]
 * Each detection: [x1, y1, x2, y2, class_id, confidence]
 * No NMS needed -- already applied inside the model.
 */
export function processYolo26nOutput(
  outputData: Float32Array,
  outputDims: number[],
  confidenceThreshold: number,
  originalWidth: number,
  originalHeight: number
): Detection[] {
  const maxDetections = outputDims[1]; // 300
  const valuesPerDet = outputDims[2];  // 6
  const scaleX = originalWidth / INPUT_SIZE;
  const scaleY = originalHeight / INPUT_SIZE;
  const detections: Detection[] = [];

  for (let i = 0; i < maxDetections; i++) {
    const offset = i * valuesPerDet;
    const confidence = outputData[offset + 5];
    if (confidence < confidenceThreshold) continue;

    const classId = Math.round(outputData[offset + 4]);
    detections.push({
      box: {
        x1: outputData[offset + 0] * scaleX,
        y1: outputData[offset + 1] * scaleY,
        x2: outputData[offset + 2] * scaleX,
        y2: outputData[offset + 3] * scaleY,
      },
      confidence,
      classId,
      className: CLASS_LABELS[classId] || `class_${classId}`,
      classNameEs: CLASS_LABELS_ES[classId] || `clase_${classId}`,
    });
  }

  return detections;
}
```

### 2.3 `src/inference/postprocessingYolo11n.ts` (YOLO11n + NMS)

```typescript
/**
 * Parse YOLO11n raw output: [1, 7, 8400]
 * Each anchor: [cx, cy, w, h, score_c0, score_c1, score_c2]
 * Requires confidence filtering + NMS (IoU 0.45).
 */
export function processYolo11nOutput(
  outputData: Float32Array,
  outputDims: number[],
  confidenceThreshold: number,
  iouThreshold: number,
  originalWidth: number,
  originalHeight: number
): Detection[]

// Internal helpers:
function nms(detections: Detection[], iouThreshold: number): Detection[]
function computeIoU(a: BoundingBox, b: BoundingBox): number
```

### 2.4 `src/inference/modelDetector.ts`

```typescript
import { InferenceSession, Tensor } from 'onnxruntime-react-native';

/**
 * Auto-detect model type by running a dummy inference
 * and inspecting the output tensor shape.
 */
export async function detectModelType(
  session: InferenceSession
): Promise<ModelType> {
  const inputName = session.inputNames[0];
  const dummyData = new Float32Array(1 * 3 * 640 * 640); // zeros
  const dummyTensor = new Tensor('float32', dummyData, [1, 3, 640, 640]);

  const feeds: Record<string, Tensor> = { [inputName]: dummyTensor };
  const results = await session.run(feeds);
  const outputName = session.outputNames[0];
  const shape = results[outputName].dims;

  // YOLO26n: [1, 300, 6] -- end-to-end with NMS
  if (shape.length === 3 && shape[1] === 300 && shape[2] === 6) {
    return 'yolo26n';
  }

  // YOLO11n: [1, 7, 8400] -- raw anchors, needs NMS
  if (shape.length === 3 && shape[1] === 7 && shape[2] === 8400) {
    return 'yolo11n';
  }

  return 'unknown';
}
```

### 2.5 `src/inference/modelService.ts`

```typescript
import { InferenceSession, Tensor } from 'onnxruntime-react-native';

let session: InferenceSession | null = null;
let currentModelInfo: ModelInfo | null = null;

/**
 * Load an ONNX model from a local file URI.
 * Auto-detects model type (yolo26n vs yolo11n).
 */
export async function loadModelFromUri(fileUri: string): Promise<ModelInfo>

/**
 * Run inference on an image.
 * Automatically uses the correct postprocessor based on detected model type.
 */
export async function runInference(
  imageUri: string,
  confidenceThreshold?: number
): Promise<DetectionResult>

/**
 * Unload the current model from memory.
 */
export async function unloadModel(): Promise<void>

/**
 * Get info about the currently loaded model.
 */
export function getModelInfo(): ModelInfo | null
```

### 2.6 `src/hooks/useModel.ts`
```typescript
interface UseModelReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  modelInfo: ModelInfo | null;
  loadModel: (uri: string) => Promise<void>;
  unloadModel: () => Promise<void>;
}

export function useModel(): UseModelReturn
```
- Uses `AsyncStorage` to persist the last loaded model URI
- On app launch, attempts to reload the last used model

### 2.7 `src/hooks/useDetection.ts`
```typescript
interface UseDetectionReturn {
  result: DetectionResult | null;
  isProcessing: boolean;
  error: string | null;
  detect: (imageUri: string) => Promise<void>;
  clear: () => void;
}

export function useDetection(): UseDetectionReturn
```

### 2.8 `src/hooks/useImagePicker.ts`
```typescript
interface UseImagePickerReturn {
  pickFromCamera: () => Promise<string | null>;  // returns imageUri
  pickFromGallery: () => Promise<string | null>;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  requestPermissions: () => Promise<void>;
}

export function useImagePicker(): UseImagePickerReturn
```

---

## Phase 3: Navigation

### `app/_layout.tsx` (Root Stack)
```typescript
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="detection"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Resultados',
            headerStyle: { backgroundColor: '#5D4037' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

### `app/(tabs)/_layout.tsx` (Tab Navigator)
```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#8B6B61',
        tabBarStyle: {
          backgroundColor: '#3E2723',
          borderTopColor: '#5D4037',
        },
        headerStyle: { backgroundColor: '#5D4037' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: 'CacaoVision',
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Acerca de',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## Phase 4: Home Screen

### `app/(tabs)/index.tsx`

**Layout (top to bottom):**
1. **Header area** (inside tab header): "CacaoVision" title
2. **Model status section**:
   - `ModelStatusBadge` -- green/red dot + model name or "Sin modelo cargado"
   - "Importar Modelo" button (secondary style) -> opens document picker for `.onnx`
   - If model loaded: auto-detected type label + manual toggle (segmented control)
3. **Main action area** (centered):
   - Large illustration or icon of a cacao pod
   - **"Detectar Enfermedad"** button (large, rounded, primary color `#5D4037`)
   - Disabled state if no model loaded (with tooltip/message)
4. **Bottom sheet** (`ImageSourceSheet`):
   - Triggered by "Detectar Enfermedad" button tap
   - Two options with icons:
     - Camera icon + "Tomar Foto"
     - Gallery icon + "Elegir de Galeria"
   - On selection: capture/pick image -> show loading -> navigate to `detection` screen

### Components

#### `src/components/ImageSourceSheet.tsx`
- `@gorhom/bottom-sheet` with 2 snap points
- Two large tappable rows with icons
- Cacao-themed styling (cream background, brown text)

#### `src/components/ModelStatusBadge.tsx`
- Small badge showing: colored dot (green=loaded, red=none) + text
- Shows model type (e.g., "YOLO26n" or "YOLO11n") when loaded
- Shows "Sin modelo" when not loaded

#### `src/components/ModelSelector.tsx`
- "Importar Modelo" button -> `expo-document-picker` filtered for `.onnx`
- After import: shows auto-detected type
- Manual toggle: segmented control to override model type if auto-detection fails
- Loading indicator during model import + auto-detection

#### `src/components/EmptyState.tsx`
- Friendly illustration (cacao pod + magnifying glass icon)
- "Importa un modelo ONNX para comenzar"
- "Importar Modelo" button

---

## Phase 5: Detection Results Screen

### `app/detection.tsx`

**Route params** (passed via router): `{ imageUri, detections, processingTimeMs, modelType, imageWidth, imageHeight }`

**Layout:**
1. **Image with bounding box overlay** (top 60% of screen):
   - Original captured/picked image displayed at full width
   - `DetectionOverlay` renders boxes on top with absolute positioning
   - Each box: colored border + label badge with class name + confidence %
   - Pinch-to-zoom support (optional enhancement)

2. **Detection summary** (bottom 40%, scrollable):
   - `DetectionMetrics` component:
     - Total detections count (large number)
     - Per-class breakdown with colored chips
     - Inference time (e.g., "125 ms")
     - Model used (e.g., "YOLO26n")
   - List of individual detections (class, confidence, box size)

3. **Action buttons** (bottom bar):
   - "Nueva Deteccion" -> navigate back to Home
   - "Compartir" -> share image with overlays (optional)

### Components

#### `src/components/DetectionOverlay.tsx`
```typescript
interface DetectionOverlayProps {
  detections: Detection[];
  imageWidth: number;     // original image dimensions
  imageHeight: number;
  displayWidth: number;   // rendered image dimensions on screen
  displayHeight: number;
}
```
- Maps detection coordinates from original image space to display coordinates
- Renders `View` with absolute positioning for each box
- Box border color = `CLASS_COLORS[className]`
- Label badge: `"{classNameEs} {confidence}%"` with semi-transparent background

#### `src/components/DetectionMetrics.tsx`
```typescript
interface DetectionMetricsProps {
  detections: Detection[];
  processingTimeMs: number;
  modelType: ModelType;
}
```
- Card-style layout with:
  - Detections count per class (colored badges)
  - Processing time
  - Model type badge

---

## Phase 6: About Screen

### `app/(tabs)/about.tsx`

**Content:**
- App icon/logo
- **"CacaoVision"** (large title)
- Version: `1.0.0`
- Divider
- **"Sobre el Proyecto"** section:
  - "TFM - Deteccion de Enfermedades en Cacao mediante Vision por Computadora"
  - Brief description: "Aplicacion movil que utiliza modelos YOLO entrenados para detectar enfermedades en mazorcas de cacao a partir de fotografias."
- **"Autor"** section:
  - Author name: Luis Sanchez
  - Year: 2025
  - University: Universidad Internacional de Valencia (VIU)
  - Program: Master en Inteligencia Artificial
- **"Tecnologias"** section:
  - Badges/chips: Expo, React Native, ONNX Runtime, YOLO, TypeScript
- **"Codigo Fuente"** section:
  - GitHub link (tappable, opens in browser)
  - MIT License badge
- **"Modelos Soportados"** section:
  - YOLO26n: 9.35 MB, deteccion end-to-end
  - YOLO11n: 10.11 MB, requiere NMS en app
  - 3 clases: Saludable, Moniliasis, Mazorca Negra

---

## Phase 7: Model Import and Dynamic Loading

### Flow

```
User taps "Importar Modelo"
  |
  v
expo-document-picker opens (filter: *.onnx)
  |
  v
User selects .onnx file
  |
  v
File copied to app storage via expo-file-system
  |
  v
InferenceSession.create(localUri) loads the model
  |
  v
Auto-detection: dummy inference -> inspect output shape
  |  [1, 300, 6] -> yolo26n
  |  [1, 7, 8400] -> yolo11n
  |  other -> unknown
  v
ModelStatusBadge updates (green dot + model name)
  |
  v
If "unknown": show manual toggle for user to select type
  |
  v
Model URI saved to AsyncStorage (auto-reload on next launch)
```

### Auto-detection implementation

```typescript
// In modelDetector.ts
export async function detectModelType(session: InferenceSession): Promise<ModelType> {
  const inputName = session.inputNames[0];
  const dummyData = new Float32Array(1 * 3 * 640 * 640);
  const dummyTensor = new Tensor('float32', dummyData, [1, 3, 640, 640]);
  const results = await session.run({ [inputName]: dummyTensor });
  const shape = results[session.outputNames[0]].dims;

  if (shape[1] === 300 && shape[2] === 6) return 'yolo26n';
  if (shape[1] === 7 && shape[2] === 8400) return 'yolo11n';
  return 'unknown';
}
```

### Manual toggle

When auto-detection returns `'unknown'`, the `ModelSelector` component shows a segmented control:

```
[ YOLO26n ] [ YOLO11n ]
```

The user taps to select, and the app overrides the detected type. This selection is also persisted.

### Persistence

```typescript
// useModel.ts
const MODEL_URI_KEY = '@cacaovision/model_uri';
const MODEL_TYPE_KEY = '@cacaovision/model_type';

// On load: check AsyncStorage for previously used model
// On successful import: save URI + detected type
```

---

## Phase 8: Dev Build and Testing

### 8.1 Setup dev client
```bash
npx expo install expo-dev-client
eas build --profile development --platform ios   # for iOS simulator
eas build --profile development --platform android  # for Android APK
```

### 8.2 Testing checklist

- [ ] **Build**: App builds for iOS simulator and Android emulator without errors
- [ ] **Model import**: Document picker opens, `.onnx` file can be selected and loaded
- [ ] **Auto-detection**: YOLO26n model correctly identified as `yolo26n`
- [ ] **Auto-detection**: YOLO11n model correctly identified as `yolo11n`
- [ ] **Manual toggle**: User can override model type selection
- [ ] **Camera capture**: Camera opens, photo captured, returns image URI
- [ ] **Gallery pick**: Gallery opens, photo selected, returns image URI
- [ ] **Inference (YOLO26n)**: Detections returned with correct bounding boxes
- [ ] **Inference (YOLO11n)**: Detections returned with NMS applied correctly
- [ ] **Overlay rendering**: Bounding boxes align correctly with image
- [ ] **Detection metrics**: Correct counts, timing, model name displayed
- [ ] **About screen**: All project info renders correctly
- [ ] **No model state**: "Detectar Enfermedad" disabled, empty state shown
- [ ] **Error handling**: Graceful messages for invalid model, camera denied, etc.
- [ ] **Persistence**: Last used model auto-loaded on app restart

---

## Phase 9: Polish and Production

### Visual polish
- Custom splash screen with CacaoVision branding (brown + cream)
- App icon with cacao pod illustration
- Loading animations using `react-native-reanimated`
- Smooth bottom sheet transitions
- Haptic feedback on detection complete

### UX improvements
- Toast notifications for model load success/failure
- Progress indicator during inference
- Empty state illustrations
- Onboarding flow for first-time users (how to import model)

### Production readiness
- Error boundaries wrapping each screen
- Sentry or similar crash reporting (optional)
- All UI text in Spanish
- README.md with: screenshots, architecture diagram, setup instructions, usage guide
- LICENSE file (MIT)
- `.gitignore` with Expo defaults

### Production build
```bash
eas build --profile production --platform all
```

---

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Expo SDK 53+ | Cross-platform, managed workflow, TypeScript |
| Navigation | Expo Router (file-based) | Modern, type-safe, deep linking ready |
| Styling | NativeWind v5 + Tailwind v4 | Utility-first, consistent, rapid development |
| ML Runtime | `onnxruntime-react-native` | Official Microsoft package, single model for iOS+Android |
| Image Capture | `expo-camera` + `expo-image-picker` | Capture or pick, not real-time video |
| Bottom Sheet | `@gorhom/bottom-sheet` | Best RN bottom sheet, Reanimated-powered |
| Model Import | `expo-document-picker` + `expo-file-system` | Dynamic loading from device storage |
| State | React hooks + AsyncStorage | Simple, no external state management needed |
| Primary Model | YOLO26n | Simpler postprocessing, smaller, better recall |
| UI Language | Spanish | Target users are Latin American cacao farmers |

---

## Verification Checklist

1. `npx expo start` runs without errors
2. Dev build installs on simulator/emulator
3. Import YOLO26n `.onnx` -> auto-detected correctly -> status badge green
4. Import YOLO11n `.onnx` -> auto-detected correctly -> status badge green
5. Capture photo via camera -> bounding boxes displayed -> metrics shown
6. Pick photo from gallery -> bounding boxes displayed -> metrics shown
7. About screen displays: author, year, project description, technologies
8. App handles edge cases: no model loaded, camera permission denied, invalid model file
9. App restarts and auto-loads last used model
10. All UI text is in Spanish

---

## Reference Files (from tfm-model)

Copy these files from the `tfm-model` repository into the Expo project:

| Source (tfm-model) | Destination (CacaoVision) | Purpose |
|---------------------|---------------------------|---------|
| `exports/yolo26n/yolo26n.onnx` | Share with users / not bundled | Primary model (9.35 MB) |
| `exports/yolo11n/yolo11n.onnx` | Share with users / not bundled | Secondary model (10.11 MB) |
| `docs/MODEL_EXPORT_GUIDE.md` | Reference only | Full model specs |

> Models are NOT bundled in the app binary. Users import them via the document picker.
> This keeps the app download small and allows model updates without app updates.

---

*This plan is part of the TFM: Cacao Disease Detection System.*
*Author: Luis Sanchez | Universidad Internacional de Valencia (VIU) | 2025*
