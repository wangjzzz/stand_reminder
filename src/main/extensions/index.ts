import type { ReminderContent } from '../../shared/types'

export interface ContentContext { date: string; completedBreaks: number }
/** Register trusted, bundled providers here. Future AI providers can run in main. */
export interface ContentProvider {
  id: string
  getContent(context: ContentContext): ReminderContent
}
const quotes = [
  '慢一点也没关系，持续向前就好。',
  '把今天过好，就是对未来最踏实的准备。',
  '给思考留白，让灵感有地方发生。',
  '专注值得珍惜，你自己也是。',
  '短暂离开屏幕，带着新的目光回来。'
]
export const dailyContent: ContentProvider = {
  id: 'local-daily-quote',
  getContent({ date }) {
    const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return {
      title: '起身，让身体换个节奏。',
      message: '放下手边的工作，站起来走走。看一眼窗外，也给思绪一点自由。',
      quote: quotes[seed % quotes.length], source: '起身 · 每日寄语'
    }
  }
}
