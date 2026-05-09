export type UserRole = 'user' | 'admin'
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  createdAt: string
}
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  metrics?: ProfilingMetrics
  timestamp: string
}
export interface Chat {
  id: string
  userId: string
  title: string
  messages: Message[]
  lastMcu?: string
  lastCamera?: string
  lastMetrics?: ProfilingMetrics
  lastCode?: string
  createdAt: string
  updatedAt: string
}
export interface ProfilingMetrics {
  flash: number        // KB
  ram: number          // KB
  latency: number      // ms per frame
  energy: number       // mJ per frame
  complexity: string   // Big-O notation
  complexityDesc: string
  cpuFreq?: number     // MHz
  notes?: string
}
export interface GenerateRequest {
  prompt: string
  device: string
  camera: string
  chatId?: string
}
export interface GenerateResponse {
  code: string
  explanation: string
  metrics: ProfilingMetrics
  chatId: string
  messageId: string
}
export interface ProfileRequest {
  code: string
  device: string
}
export interface AdminStats {
  totalUsers: number
  totalChats: number
  totalMessages: number
  activeToday: number
  popularDevices: { device: string; count: number }[]
  recentUsers: User[]
}
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const DEVICES = [
  'STM32H7', 'STM32F4', 'STM32F1',
  'ESP32', 'ESP32-CAM', 'ESP32-S3',
  'Raspberry Pi 4', 'Raspberry Pi Zero 2W',
  'Jetson Nano', 'Jetson Orin',
  'OpenMV H7', 'Arduino Nicla Vision',
  'K210 Maix', 'Arduino Mega',
] as const

export const CAMERAS = [
  // ── OmniVision ──────────────────────────────
  'OV2640',
  'OV7670',
  'OV7725',
  'OV5640',
  'OV9650',
  'OV3660',
  // ── Sony / Raspberry Pi ─────────────────────
  'IMX219',
  'IMX477',
  'IMX708',
  'Pi Camera v2',
  'Pi Camera Module 3',
  'Pi Camera HQ',
  // ── ArduCam ─────────────────────────────────
  'ArduCam OV2640',
  'ArduCam OV5647',
  'ArduCam IMX219',
  'ArduCam IMX477',
  'ArduCam 64MP Hawkeye',
  // ── OpenMV / DCMI ───────────────────────────
  'OpenMV Cam H7',
  'OpenMV Cam H7 Plus',
  'OpenMV Cam RT1062',
  'DCMI Generic',
  // ── Himax / Seeed / misc ────────────────────
  'HM01B0',
  'HM0360',
  'GC2145',
  'MT9V034',
  // ── USB / Generic ───────────────────────────
  'USB Camera',
  'USB Webcam (UVC)',
  'USB Webcam 1080p',
  'IP Camera (RTSP)',
] as const

export type Device = typeof DEVICES[number]
export type Camera = typeof CAMERAS[number]
