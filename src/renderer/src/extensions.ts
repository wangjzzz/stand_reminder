import { CalendarDays, MessageCircleHeart, Sparkles, UserRound } from 'lucide-react'

/** UI catalog is separate from main-process content providers. */
export const extensions = [
  { id: 'daily-quote', title: '每日一句', description: '给平凡的一天，一点温柔的注脚。', icon: MessageCircleHeart, ready: true, tag: '本地文案' },
  { id: 'daily-plan', title: '今日计划', description: '把学习与生活，安排成舒服的节奏。', icon: CalendarDays, ready: false, tag: '规划中' },
  { id: 'character', title: '角色陪伴', description: '让喜欢的角色，提醒你照顾自己。', icon: UserRound, ready: false, tag: '规划中' },
  { id: 'ai-message', title: 'AI 贴心提醒', description: '根据当下的状态，说一句刚好的话。', icon: Sparkles, ready: false, tag: '规划中' }
]
