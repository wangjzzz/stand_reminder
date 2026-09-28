import { Check, Eye, Plus, Shirt } from 'lucide-react'
import { useState } from 'react'
import { pets } from './pets'

export function PetPicker({ selectedId, onSelect }: {
  selectedId: string
  onSelect: (id: string) => Promise<void>
}) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const select = async (id: string) => {
    setSavingId(id)
    setMessage('')
    try {
      await onSelect(id)
      setMessage('已换好，下次显示桌宠时立即生效。')
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSavingId(null)
    }
  }
  return <>
    <div className="page-heading pet-picker-heading"><div><div className="eyebrow">YOUR LITTLE COMPANION</div><h1>挑一个喜欢的伙伴。</h1><p>它会在主窗口关闭后，安静地陪你记录本轮工作时间。</p></div><button className="secondary-button" onClick={() => window.desktop.showPet()}><Eye size={16} /> 预览当前桌宠</button></div>
    <section className="pet-picker-section">
      <div className="pet-picker-title"><div><Shirt size={18} /><h2>桌宠衣橱</h2></div><span>{pets.length} 个形象</span></div>
      <div className="pet-choice-grid">
        {pets.map(pet => {
          const selected = pet.id === selectedId
          return <article className={`pet-choice-card ${selected ? 'selected' : ''}`} key={pet.id}>
            <div className="pet-choice-preview"><img src={pet.image} alt={pet.alt} /></div>
            <div className="pet-choice-info"><div><h3>{pet.name}</h3><p>专注学习款 · 原创桌宠</p></div>{selected && <span className="selected-mark"><Check size={13} /> 当前使用</span>}</div>
            <button className={selected ? 'selected-button' : 'primary'} disabled={selected || savingId !== null} onClick={() => select(pet.id)}>
              {selected ? <><Check size={15} /> 正在使用</> : savingId === pet.id ? '正在更换…' : '使用这个桌宠'}
            </button>
          </article>
        })}
        <article className="pet-choice-card future-pet" aria-label="未来可以添加更多桌宠"><span><Plus size={25} /></span><h3>留给下一位伙伴</h3><p>以后只需添加图片与一条桌宠定义，它就会出现在这里。</p></article>
      </div>
      <div className="pet-picker-foot"><span role="status">{message || '桌宠选择保存在这台电脑上。'}</span><span>图片目录：public/pets</span></div>
    </section>
  </>
}
