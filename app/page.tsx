'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardPlus,
  FileText, LogOut, PawPrint, Plus, Settings2, ShieldCheck, Syringe,
  Pencil, Stethoscope, Trash2, UserRound, Weight, X,
} from 'lucide-react'

type Pet = { id: number; name: string; species: string; breed: string; gender: string; birth: string; icon: string; photo?: string; allergies: string; hospital: string; profileNote: string }
type Attachment = { name: string; type: string; size: number; dataUrl: string }
type Vaccine = { id: number; petId: number; name: string; date: string; next: string; memo: string }
type Visit = { id: number; petId: number; date: string; hospital: string; purpose: string; weight: string; memo: string; attachments: Attachment[] }
type View = 'home' | 'pets' | 'visits' | 'vaccines' | 'calendar' | 'record' | 'settings'
type StoredData = { pets: Pet[]; vaccines: Vaccine[]; visits: Visit[]; ownerName: string; reminderDays: number; notificationsEnabled: boolean }
type EditingRecord = { kind: 'visit'; value: Visit } | { kind: 'vaccine'; value: Vaccine }
type DeleteTarget = { kind: 'pet'; value: Pet } | { kind: 'visit'; value: Visit; petName: string } | { kind: 'vaccine'; value: Vaccine; petName: string }

const STORAGE_KEY = 'pet-care-data-v2'
const MAX_MEDIA_DATA_URL_CHARS = 1_500_000
const navItems: { key: View; label: string; icon: typeof Activity }[] = [
  { key: 'home', label: 'ホーム', icon: Activity }, { key: 'pets', label: 'ペット', icon: PawPrint },
  { key: 'visits', label: '通院記録', icon: Stethoscope }, { key: 'vaccines', label: 'ワクチン', icon: Syringe },
  { key: 'calendar', label: '予定カレンダー', icon: CalendarDays }, { key: 'settings', label: '通知設定', icon: Settings2 },
]

function dateOnly(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function daysUntil(value: string) {
  if (!value) return 0
  const [year, month, day] = value.split('-').map(Number)
  return Math.round((dateOnly(new Date(year, month - 1, day)).getTime() - dateOnly(new Date()).getTime()) / 86400000)
}
function formatDate(value: string) {
  if (!value) return '未登録'
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}
function Logo() { return <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#36724f] text-white"><PawPrint size={21} /></span><span className="text-lg font-bold tracking-tight text-[#234431]">Pet Care</span></div> }

function AuthScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [message, setMessage] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const savedOwnerName = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').ownerName
    const name = String(data.get('name') || savedOwnerName || '飼い主さん')
    setMessage(mode === 'login' ? 'ログインしました。' : 'アカウントを作成しました。')
    window.setTimeout(() => onLogin(name), 250)
  }
  return <main className="min-h-screen bg-[#f7faf7] text-[#27352d] lg:grid lg:grid-cols-[1.15fr_.85fr]">
    <section className="hidden flex-col justify-between bg-[#deefe2] p-12 lg:flex xl:p-20"><div><Logo /><div className="mt-24"><p className="text-xs font-bold tracking-[.2em] text-[#5c8b6c]">あなたと、ペットの毎日に</p><h1 className="mt-5 text-5xl font-semibold leading-tight text-[#234d34]">大切な家族の<br />健康を、ひとつに。</h1><p className="mt-6 max-w-md leading-8 text-[#587564]">通院記録やワクチン予定をかんたんに管理。まずは、あなたのペットを登録しましょう。</p></div></div><div className="flex items-center gap-2 text-sm text-[#5b7d66]"><ShieldCheck size={18} />ペットの情報はこの端末に保存されます</div></section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-[390px]"><div className="mb-10 lg:hidden"><Logo /></div><p className="text-sm font-semibold text-[#6f997a]">PET CAREへようこそ</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{mode === 'login' ? 'おかえりなさい' : '健康管理をはじめる'}</h2><p className="mt-2 text-sm leading-6 text-[#7b877f]">{mode === 'login' ? '登録した情報を引き続き確認できます。' : 'アカウントを作成して、ペットの記録を管理しましょう。'}</p><div className="mt-7 grid grid-cols-2 rounded-xl bg-[#e9efea] p-1 text-sm font-medium"><button onClick={() => setMode('signup')} className={`rounded-lg py-2.5 ${mode === 'signup' ? 'bg-white text-[#36724f] shadow-sm' : 'text-[#89958d]'}`}>新規登録</button><button onClick={() => setMode('login')} className={`rounded-lg py-2.5 ${mode === 'login' ? 'bg-white text-[#36724f] shadow-sm' : 'text-[#89958d]'}`}>ログイン</button></div><form onSubmit={submit} className="mt-6 space-y-4">{mode === 'signup' && <Field label="飼い主のお名前" name="name" placeholder="例：山田 太郎" required />}<Field label="メールアドレス" name="email" type="email" placeholder="you@example.com" required /><Field label="パスワード" name="password" type="password" placeholder="6文字以上" required /><button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#36724f] text-sm font-semibold text-white shadow-lg shadow-[#36724f]/20">{mode === 'login' ? 'ログイン' : 'アカウントを作成'}<ChevronRight size={17} /></button></form>{message && <p role="status" className="mt-4 rounded-xl bg-[#e6f3e9] px-4 py-3 text-center text-sm text-[#36724f]">{message}</p>}<p className="mt-7 text-center text-xs leading-5 text-[#9aa69d]">このデモは認証サーバーと連携していません。入力内容を送信せず、記録はこのブラウザー内に保存します。</p></div></section>
  </main>
}

function Field({ label, name, type = 'text', placeholder, required = false }: { label: string; name: string; type?: string; placeholder: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input name={name} type={type} placeholder={placeholder} required={required} minLength={type === 'password' ? 6 : undefined} className="h-12 w-full rounded-xl border border-[#dce5dd] bg-white px-4 text-sm outline-none placeholder:text-[#b4beb6] focus:border-[#75a486] focus:ring-4 focus:ring-[#e1f0e4]" /></label>
}

function PetAvatar({ pet, className }: { pet: Pet; className: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef6ef] ${className}`}>{pet.photo ? <img src={pet.photo} alt={`${pet.name}の写真`} className="h-full w-full object-cover" /> : pet.icon}</span>
}

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pets, setPets] = useState<Pet[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [reminderDays, setReminderDays] = useState(14)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [view, setView] = useState<View>('home')
  const [recordType, setRecordType] = useState<'visit' | 'vaccine'>('visit')
  const [showAddPet, setShowAddPet] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<StoredData>
        setPets(saved.pets ?? []); setVaccines(saved.vaccines ?? []); setVisits(saved.visits ?? [])
        setOwnerName(saved.ownerName ?? ''); setReminderDays(saved.reminderDays ?? 14)
        setNotificationsEnabled(saved.notificationsEnabled ?? false)
        if (saved.pets?.length) setSelectedId(saved.pets[0].id)
      }
    } catch { localStorage.removeItem(STORAGE_KEY) }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const data: StoredData = { pets, vaccines, visits, ownerName, reminderDays, notificationsEnabled }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
    catch { setToast('保存容量の上限に達しました。写真や添付ファイルを減らしてください。') }
  }, [hydrated, pets, vaccines, visits, ownerName, reminderDays, notificationsEnabled])

  const selectedPet = pets.find((pet) => pet.id === selectedId) ?? pets[0]
  const petVaccines = vaccines.filter((vaccine) => vaccine.petId === selectedPet?.id)
  const petVisits = visits.filter((visit) => visit.petId === selectedPet?.id).sort((a, b) => b.date.localeCompare(a.date))
  const upcoming = useMemo(() => vaccines.map((vaccine) => ({ vaccine, pet: pets.find((pet) => pet.id === vaccine.petId), days: daysUntil(vaccine.next) })).filter((item) => item.pet && item.days >= 0).sort((a, b) => a.days - b.days), [vaccines, pets])

  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const due = upcoming.find(({ days }) => days <= reminderDays)
    if (!due) return
    const key = `pet-care-notified-${due.vaccine.id}-${due.vaccine.next}`
    if (sessionStorage.getItem(key)) return
    new Notification('ワクチン予定のお知らせ', { body: `${due.pet?.name}の${due.vaccine.name}は${due.days === 0 ? '今日' : `${due.days}日後`}です。` })
    sessionStorage.setItem(key, '1')
  }, [notificationsEnabled, reminderDays, upcoming])

  function notify(text: string) { setToast(text); window.setTimeout(() => setToast(''), 2800) }
  function login(name: string) { setOwnerName((current) => current || name); setLoggedIn(true); setView('home'); if (!pets.length) setShowAddPet(true) }
  function addVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPet) return
    const form = event.currentTarget
    const data = new FormData(form)
    const currentVisit = editingRecord?.kind === 'visit' ? editingRecord.value : null
    const files = data.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0)
    const keepIndexes = new Set(data.getAll('keepAttachments').map(Number))
    const keptAttachments = currentVisit?.attachments.filter((_, index) => keepIndexes.has(index)) ?? []
    const storedMediaChars = pets.reduce((total, pet) => total + (pet.photo?.length ?? 0), 0) + visits.reduce((total, visit) => total + (visit.id === currentVisit?.id ? 0 : visit.attachments.reduce((sum, file) => sum + file.dataUrl.length, 0)), 0)
    const newMediaChars = files.reduce((total, file) => total + Math.ceil(file.size * 1.4) + 100, 0)
    if (files.length + keptAttachments.length > 3 || files.some((file) => file.size > 3 * 1024 * 1024) || storedMediaChars + newMediaChars + keptAttachments.reduce((sum, file) => sum + file.dataUrl.length, 0) > MAX_MEDIA_DATA_URL_CHARS) { notify('添付は画像またはPDF、1ファイル3MB以下・1記録3件までです。ブラウザー内の合計保存容量を超える場合は添付を減らしてください。'); return }
    Promise.all(files.map((file) => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) }); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file)
    }))).then((attachments) => {
      const rawWeight = String(data.get('weight') || '')
      const updatedVisit: Visit = { id: currentVisit?.id ?? Date.now(), petId: currentVisit?.petId ?? selectedPet.id, date: String(data.get('date')), hospital: String(data.get('hospital')), purpose: String(data.get('purpose')), weight: rawWeight, memo: String(data.get('memo')), attachments: [...keptAttachments, ...attachments] }
      setVisits((current) => currentVisit ? current.map((visit) => visit.id === currentVisit.id ? updatedVisit : visit) : [updatedVisit, ...current])
      setEditingRecord(null); setView('visits'); notify(currentVisit ? '通院記録を更新しました。' : '通院記録を保存しました。')
    }).catch(() => notify('ファイルを読み込めませんでした。'))
  }
  function addVaccine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    if (!selectedPet) return
    const currentVaccine = editingRecord?.kind === 'vaccine' ? editingRecord.value : null
    const updatedVaccine: Vaccine = { id: currentVaccine?.id ?? Date.now(), petId: currentVaccine?.petId ?? selectedPet.id, name: String(data.get('name')), date: String(data.get('date')), next: String(data.get('next')), memo: String(data.get('memo')) }
    setVaccines((current) => currentVaccine ? current.map((vaccine) => vaccine.id === currentVaccine.id ? updatedVaccine : vaccine) : [updatedVaccine, ...current])
    setEditingRecord(null); setView('vaccines'); notify(currentVaccine ? 'ワクチン記録を更新しました。' : 'ワクチン記録を保存しました。')
  }
  function addPet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const photo = data.get('photo')
    if (photo instanceof File && photo.size > 1024 * 1024) { notify('写真は1MB以下の画像を選択してください。'); return }
    const storedMediaChars = pets.reduce((total, item) => total + (item.id === editingPet?.id ? 0 : item.photo?.length ?? 0), 0) + visits.reduce((total, visit) => total + visit.attachments.reduce((sum, file) => sum + file.dataUrl.length, 0), 0)
    if (photo instanceof File && photo.size > 0 && storedMediaChars + Math.ceil(photo.size * 1.4) + 100 > MAX_MEDIA_DATA_URL_CHARS) { notify('ブラウザーの保存容量を超えるため、ほかの写真や添付を減らしてください。'); return }
    const savePet = (photoData?: string) => {
      const pet: Pet = { id: editingPet?.id ?? Date.now(), name: String(data.get('name')), species: String(data.get('species')), breed: String(data.get('breed') || ''), gender: String(data.get('gender') || ''), birth: String(data.get('birth') || ''), icon: String(data.get('icon') || '🐾'), photo: photoData ?? editingPet?.photo, allergies: String(data.get('allergies') || ''), hospital: String(data.get('hospital') || ''), profileNote: String(data.get('profileNote') || '') }
      setPets((current) => editingPet ? current.map((item) => item.id === editingPet.id ? pet : item) : [...current, pet]); setSelectedId(pet.id); setShowAddPet(false); setEditingPet(null); setView(editingPet ? 'pets' : 'home'); notify(editingPet ? `${pet.name}のプロフィールを更新しました。` : `${pet.name}を登録しました。`)
    }
    if (photo instanceof File && photo.size > 0) {
      const reader = new FileReader(); reader.onload = () => savePet(String(reader.result)); reader.onerror = () => notify('写真を読み込めませんでした。'); reader.readAsDataURL(photo)
    } else savePet()
  }
  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'pet') {
      const petId = deleteTarget.value.id
      setPets((current) => current.filter((pet) => pet.id !== petId))
      setVisits((current) => current.filter((visit) => visit.petId !== petId))
      setVaccines((current) => current.filter((vaccine) => vaccine.petId !== petId))
      if (selectedId === petId) setSelectedId(pets.find((pet) => pet.id !== petId)?.id ?? null)
      notify(`${deleteTarget.value.name}と関連する記録を削除しました。`)
    } else if (deleteTarget.kind === 'visit') {
      setVisits((current) => current.filter((visit) => visit.id !== deleteTarget.value.id))
      notify('通院記録を削除しました。')
    } else {
      setVaccines((current) => current.filter((vaccine) => vaccine.id !== deleteTarget.value.id))
      notify('ワクチン記録を削除しました。')
    }
    setDeleteTarget(null)
  }
  async function enableNotifications() {
    if (!('Notification' in window)) { notify('このブラウザーは通知に対応していません。'); return }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') { setNotificationsEnabled(true); notify('通知を有効にしました。ページを開いている間に予定をお知らせします。') }
    else { setNotificationsEnabled(false); notify('通知は許可されませんでした。ブラウザーの設定をご確認ください。') }
  }

  if (!hydrated) return <main className="min-h-screen bg-[#f5f8f5]" aria-label="読み込み中" />
  if (!loggedIn) return <AuthScreen onLogin={login} />

  const title = view === 'home' ? `こんにちは、${ownerName || '飼い主さん'}` : ({ pets: 'ペットプロフィール', visits: '通院記録', vaccines: 'ワクチン予定', calendar: '予定カレンダー', record: '記録を追加', settings: '通知設定' } as Record<View, string>)[view]
  return <main className="min-h-screen bg-[#f5f8f5] text-[#27352d]">
    <header className="sticky top-0 z-20 border-b border-[#e5ebe5] bg-white/95 backdrop-blur"><div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-8"><Logo /><div className="flex items-center gap-2 sm:gap-3">{selectedPet && <button onClick={() => setView('pets')} className="flex items-center gap-2 rounded-xl bg-[#eef6ef] px-3 py-2 text-sm"><span className="text-xl">{selectedPet.icon}</span><span className="hidden text-[#6e7b72] sm:inline">{selectedPet.name}</span></button>}<button onClick={() => { setLoggedIn(false); setView('home') }} className="rounded-xl p-2.5 text-[#829087] hover:bg-[#f1f5f1]" aria-label="ログアウト"><LogOut size={19} /></button></div></div></header>
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-8"><aside className="hidden w-56 shrink-0 md:block"><nav className="space-y-1">{navItems.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setView(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${view === key ? 'bg-[#e3f1e6] text-[#36724f]' : 'text-[#78867d] hover:bg-[#edf4ee]'}`}><Icon size={18} />{label}</button>)}<button onClick={() => { setRecordType('visit'); setView('record') }} className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${view === 'record' ? 'bg-[#e3f1e6] text-[#36724f]' : 'text-[#78867d] hover:bg-[#edf4ee]'}`}><ClipboardPlus size={18} />記録を追加</button></nav><div className="mt-8 rounded-2xl bg-[#e2f0e4] p-4"><ShieldCheck size={20} className="text-[#36724f]" /><p className="mt-3 text-xs leading-5 text-[#557361]">ペットの情報はこの端末のブラウザー内に保存されます。</p></div></aside>
      <section className="min-w-0 flex-1 pb-24 md:pb-10"><div className="mb-6"><p className="text-sm text-[#839087]">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1></div>
        {view === 'home' && <Home ownerName={ownerName} selectedPet={selectedPet} pets={pets} upcoming={upcoming} onView={setView} onAddPet={() => setShowAddPet(true)} onSelect={(id) => setSelectedId(id)} />}
        {view === 'pets' && <PetList pets={pets} selectedId={selectedPet?.id} onSelect={(id) => { setSelectedId(id); setView('home') }} onAdd={() => { setEditingPet(null); setShowAddPet(true) }} onEdit={(pet) => { setEditingPet(pet); setShowAddPet(true) }} onDelete={(pet) => setDeleteTarget({ kind: 'pet', value: pet })} />}
        {view === 'visits' && <VisitList visits={petVisits} pet={selectedPet} onAdd={() => { setEditingRecord(null); setRecordType('visit'); setView('record') }} onEdit={(visit) => { setEditingRecord({ kind: 'visit', value: visit }); setRecordType('visit'); setView('record') }} onDelete={(visit) => setDeleteTarget({ kind: 'visit', value: visit, petName: selectedPet?.name ?? 'ペット' })} />}
        {view === 'vaccines' && <VaccineList vaccines={petVaccines} pet={selectedPet} onAdd={() => { setEditingRecord(null); setRecordType('vaccine'); setView('record') }} onEdit={(vaccine) => { setEditingRecord({ kind: 'vaccine', value: vaccine }); setRecordType('vaccine'); setView('record') }} onDelete={(vaccine) => setDeleteTarget({ kind: 'vaccine', value: vaccine, petName: selectedPet?.name ?? 'ペット' })} />}
        {view === 'calendar' && <CalendarView month={month} onMonth={setMonth} vaccines={vaccines} pets={pets} />}
        {view === 'settings' && <SettingsView ownerName={ownerName} reminderDays={reminderDays} notificationsEnabled={notificationsEnabled} onName={setOwnerName} onDays={setReminderDays} onEnable={enableNotifications} onDisable={() => { setNotificationsEnabled(false); notify('ブラウザー通知を停止しました。') }} />}
        {view === 'record' && selectedPet && <RecordForm type={recordType} pet={selectedPet} visit={editingRecord?.kind === 'visit' ? editingRecord.value : undefined} vaccine={editingRecord?.kind === 'vaccine' ? editingRecord.value : undefined} onType={setRecordType} onVisit={addVisit} onVaccine={addVaccine} onCancel={() => { const returnView = editingRecord?.kind === 'vaccine' || (!editingRecord && recordType === 'vaccine') ? 'vaccines' : 'visits'; setEditingRecord(null); setView(returnView) }} />}
      </section>
    </div>
    {showAddPet && <AddPetModal pet={editingPet ?? undefined} onClose={() => { setShowAddPet(false); setEditingPet(null); if (!pets.length) setView('home') }} onSubmit={addPet} />}
    {deleteTarget && <DeleteConfirmation target={deleteTarget} relatedCounts={deleteTarget.kind === 'pet' ? { visits: visits.filter((visit) => visit.petId === deleteTarget.value.id).length, vaccines: vaccines.filter((vaccine) => vaccine.petId === deleteTarget.value.id).length } : undefined} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-[#e2e9e3] bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-2 backdrop-blur md:hidden">{navItems.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setView(key)} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] ${view === key ? 'text-[#36724f]' : 'text-[#89968d]'}`} aria-label={label}><Icon size={19} /><span className="truncate">{label.replace('予定カレンダー', '予定').replace('プロフィール', '')}</span></button>)}</nav>
    {toast && <div role="status" className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-[#244b35] px-4 py-3 text-sm text-white shadow-lg md:bottom-6">{toast}</div>}
  </main>
}

function Home({ ownerName, selectedPet, pets, upcoming, onView, onAddPet, onSelect }: { ownerName: string; selectedPet?: Pet; pets: Pet[]; upcoming: { vaccine: Vaccine; pet?: Pet; days: number }[]; onView: (view: View) => void; onAddPet: () => void; onSelect: (id: number) => void }) {
  if (!pets.length || !selectedPet) return <div className="rounded-3xl border border-[#e3ebe4] bg-white p-7 sm:p-10"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2e7] text-[#36724f]"><PawPrint size={28} /></span><p className="mt-6 text-sm font-semibold text-[#6a9876]">はじめてのご利用</p><h2 className="mt-2 text-2xl font-semibold">ペットを登録して始めましょう</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#78867d]">サンプル情報は登録されていません。大切な家族のプロフィールを登録すると、通院記録やワクチン予定を管理できます。</p><button onClick={onAddPet} className="mt-6 flex h-11 items-center gap-2 rounded-xl bg-[#36724f] px-5 text-sm font-semibold text-white"><Plus size={17} />ペットを登録する</button><div className="mt-8 grid gap-3 sm:grid-cols-3">{['ペットのプロフィールを作成', '通院・健康記録を追加', 'ワクチンの予定を管理'].map((item, index) => <div key={item} className="rounded-xl bg-[#f7faf7] p-4 text-sm text-[#67766d]"><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#568064]">{index + 1}</span>{item}</div>)}</div></div>
  const focus = upcoming[0]
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 rounded-3xl bg-[#deefe2] p-6 sm:flex-row sm:items-center sm:p-8"><div><p className="text-sm font-medium text-[#5b8066]">{ownerName ? `${ownerName}さんのペットケア` : '今日も健康管理を続けましょう'}</p><h2 className="mt-2 text-2xl font-semibold text-[#244b35]">{selectedPet.name}の健康プロフィール</h2><p className="mt-2 text-sm text-[#65816d]">{selectedPet.species}{selectedPet.breed && `・${selectedPet.breed}`}</p></div><PetAvatar pet={selectedPet} className="h-24 w-24 rounded-3xl bg-white/70 text-6xl" /></div>
    {focus ? <button onClick={() => onView('vaccines')} className="flex w-full items-center gap-4 rounded-2xl border border-[#dce9de] bg-white p-4 text-left hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4f2e7] text-[#36724f]"><Bell size={20} /></span><span className="min-w-0 flex-1"><b className="block text-sm">次のワクチン予定</b><span className="mt-1 block truncate text-sm text-[#68766e]">{focus.pet?.name}・{focus.vaccine.name}・{formatDate(focus.vaccine.next)}</span><span className="mt-1 block text-xs font-semibold text-[#568064]">{focus.days === 0 ? '本日予定' : `${focus.days}日後`}</span></span><ChevronRight size={18} className="text-[#9aa69d]" /></button> : <div className="rounded-2xl border border-dashed border-[#ccdacf] bg-white p-5 text-sm text-[#78867d]">ワクチン予定はありません。登録すると、ここに次の予定が表示されます。<button onClick={() => onView('record')} className="ml-2 font-semibold text-[#36724f]">予定を追加</button></div>}
    <div className="grid gap-4 sm:grid-cols-3"><ActionCard icon={PawPrint} title="プロフィール" detail="健康情報を確認" onClick={() => onView('pets')} /><ActionCard icon={Stethoscope} title="通院記録" detail="履歴と体重推移" onClick={() => onView('visits')} /><ActionCard icon={CalendarDays} title="予定カレンダー" detail="接種予定を一覧" onClick={() => onView('calendar')} /></div>
    <div><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">登録済みのペット</h2><button onClick={onAddPet} className="text-sm font-medium text-[#36724f]">＋ ペットを登録</button></div><div className="grid gap-3 sm:grid-cols-3">{pets.map((pet) => <button key={pet.id} onClick={() => onSelect(pet.id)} className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left ${pet.id === selectedPet.id ? 'border-[#78a886] ring-2 ring-[#e2f0e4]' : 'border-[#e3ebe4]'}`}><span className="text-3xl">{pet.icon}</span><span><b className="block text-sm">{pet.name}</b><span className="text-xs text-[#839087]">{pet.species}{pet.breed && `・${pet.breed}`}{pet.gender && `・${pet.gender}`}</span></span></button>)}</div></div>
  </div>
}

function ActionCard({ icon: Icon, title, detail, onClick }: { icon: typeof Activity; title: string; detail: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-2xl border border-[#e3ebe4] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f2e7] text-[#36724f]"><Icon size={20} /></span><b className="mt-4 block text-sm">{title}</b><span className="mt-1 block text-xs text-[#89968d]">{detail}</span></button> }

function PetList({ pets, selectedId, onSelect, onAdd, onEdit, onDelete }: { pets: Pet[]; selectedId?: number; onSelect: (id: number) => void; onAdd: () => void; onEdit: (pet: Pet) => void; onDelete: (pet: Pet) => void }) {
  return <div><div className="mb-5 flex items-center justify-between"><p className="text-sm text-[#839087]">健康情報とプロフィール</p><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-[#36724f] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />ペットを登録</button></div>{pets.length ? <div className="grid gap-4 lg:grid-cols-2">{pets.map((pet) => <article key={pet.id} className={`rounded-2xl border bg-white p-5 ${selectedId === pet.id ? 'border-[#78a886]' : 'border-[#e3ebe4]'}`}><button onClick={() => onSelect(pet.id)} className="flex w-full items-center gap-4 text-left"><PetAvatar pet={pet} className="h-16 w-16 text-4xl" /><span className="flex-1"><b className="text-lg">{pet.name}</b><span className="mt-1 block text-sm text-[#738077]">{pet.species}{pet.breed && `・${pet.breed}`}{pet.gender && `・${pet.gender}`}</span></span><ChevronRight size={18} className="text-[#a0aca3]" /></button><div className="mt-5 grid gap-3 border-t border-[#edf1ed] pt-4 sm:grid-cols-2"><ProfileDatum label="誕生日" value={formatDate(pet.birth)} /><ProfileDatum label="アレルギー" value={pet.allergies || '未登録'} /><ProfileDatum label="かかりつけ病院" value={pet.hospital || '未登録'} /><ProfileDatum label="健康メモ" value={pet.profileNote || '未登録'} /></div><div className="mt-4 flex justify-end border-t border-[#edf1ed] pt-3"><RecordActions editLabel="プロフィールを編集" deleteLabel="ペットを削除" onEdit={() => onEdit(pet)} onDelete={() => onDelete(pet)} /></div></article>)}</div> : <EmptyState label="ペットはまだ登録されていません" actionLabel="ペットを登録" onAdd={onAdd} />}</div>
}
function ProfileDatum({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-[#89968d]">{label}</span><span className="mt-1 block break-words text-sm">{value}</span></div> }

function RecordActions({ editLabel, deleteLabel, onEdit, onDelete }: { editLabel: string; deleteLabel: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="flex items-center gap-1"><button type="button" onClick={onEdit} aria-label={editLabel} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-[#4b7657] hover:bg-[#edf6ef]"><Pencil size={14} />編集</button><button type="button" onClick={onDelete} aria-label={deleteLabel} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-[#a94f49] hover:bg-[#fff0ee]"><Trash2 size={14} />削除</button></div>
}

function VisitList({ visits, pet, onAdd, onEdit, onDelete }: { visits: Visit[]; pet?: Pet; onAdd: () => void; onEdit: (visit: Visit) => void; onDelete: (visit: Visit) => void }) {
  if (!pet) return <EmptyState label="ペットを登録すると通院記録を管理できます" />
  const weights = visits.filter((visit) => visit.weight && Number.isFinite(Number(visit.weight))).slice().reverse()
  return <div className="space-y-6"><div className="flex items-center justify-between"><p className="text-sm text-[#839087]">{pet.icon} {pet.name}の通院・健康記録</p><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-[#36724f] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />記録を追加</button></div>{weights.length > 1 && <WeightChart visits={weights} petName={pet.name} />}{visits.length ? <div className="space-y-3">{visits.map((visit) => <article key={visit.id} className="rounded-2xl border border-[#e3ebe4] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#6f9b7a]">{formatDate(visit.date)}</p><h2 className="mt-1 font-semibold">{visit.hospital}</h2></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#edf6ef] px-3 py-1 text-xs font-medium text-[#4b7f5c]">{visit.purpose}</span><RecordActions editLabel={`${visit.hospital}の通院記録を編集`} deleteLabel={`${visit.hospital}の通院記録を削除`} onEdit={() => onEdit(visit)} onDelete={() => onDelete(visit)} /></div></div><div className="mt-4 flex flex-wrap gap-5 text-sm text-[#68766e]"><span>体重 {visit.weight}</span><span>{visit.memo}</span></div>{visit.attachments.length > 0 && <div className="mt-4 border-t border-[#edf1ed] pt-3"><p className="mb-2 text-xs font-semibold text-[#738077]">添付ファイル</p><div className="flex flex-wrap gap-2">{visit.attachments.map((file, index) => <a key={`${file.name}-${index}`} href={file.dataUrl} download={file.name} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-[#f4f8f4] px-3 py-2 text-xs text-[#456b50]"><FileText size={15} />{file.name}</a>)}</div></div>}</article>)}</div> : <EmptyState label="通院記録はまだありません" actionLabel="通院記録を追加" onAdd={onAdd} />}</div>
}

function WeightChart({ visits, petName }: { visits: Visit[]; petName: string }) {
  const values = visits.map((visit) => Number(visit.weight)).filter(Number.isFinite)
  const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1
  const points = visits.map((visit, index) => ({ ...visit, x: visits.length === 1 ? 50 : 8 + index * 84 / (visits.length - 1), y: 82 - (Number(visit.weight) - min) / spread * 60 }))
  return <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5"><div className="flex items-center gap-2"><Weight size={18} className="text-[#36724f]" /><h2 className="font-semibold">{petName}の体重推移</h2></div><svg viewBox="0 0 100 100" role="img" aria-label={`${petName}の体重推移グラフ`} className="mt-4 h-44 w-full overflow-visible"><line x1="5" y1="85" x2="95" y2="85" stroke="#e7eee8" strokeWidth="1" />{points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#5d9870" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}{points.map((point) => <g key={point.id}><circle cx={point.x} cy={point.y} r="2.2" fill="#36724f" /><text x={point.x} y={point.y - 5} textAnchor="middle" fontSize="4" fill="#456b50">{point.weight}kg</text><text x={point.x} y="94" textAnchor="middle" fontSize="3.5" fill="#89968d">{point.date.slice(5).replace('-', '/')}</text></g>)}</svg><p className="text-xs text-[#89968d]">体重が記録されている通院記録のみ表示しています。</p></section>
}

function VaccineList({ vaccines, pet, onAdd, onEdit, onDelete }: { vaccines: Vaccine[]; pet?: Pet; onAdd: () => void; onEdit: (vaccine: Vaccine) => void; onDelete: (vaccine: Vaccine) => void }) {
  if (!pet) return <EmptyState label="ペットを登録するとワクチン予定を管理できます" />
  return <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#839087]">{pet.icon} {pet.name}の接種履歴と次回予定</p><div className="flex gap-2"><button onClick={onAdd} className="flex items-center gap-2 rounded-xl border border-[#dce5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#36724f]"><Plus size={16} />予定を追加</button></div></div>{vaccines.length ? <div className="space-y-3">{vaccines.slice().sort((a, b) => a.next.localeCompare(b.next)).map((vaccine) => { const days = daysUntil(vaccine.next); const overdue = days < 0; const urgent = days <= 7; return <article key={vaccine.id} className={`rounded-2xl border bg-white p-5 ${overdue ? 'border-[#efc9c5]' : urgent ? 'border-[#f1ca8a]' : 'border-[#e3ebe4]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{vaccine.name}</h2><p className="mt-1 text-xs text-[#849189]">前回接種 {formatDate(vaccine.date)}</p></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${overdue ? 'bg-[#fde8e6] text-[#bd5750]' : urgent ? 'bg-[#fff1d0] text-[#af741b]' : 'bg-[#e7f3e9] text-[#4a7c58]'}`}>{overdue ? `${Math.abs(days)}日超過` : days === 0 ? '今日' : `あと${days}日`}</span><RecordActions editLabel={`${vaccine.name}のワクチン記録を編集`} deleteLabel={`${vaccine.name}のワクチン記録を削除`} onEdit={() => onEdit(vaccine)} onDelete={() => onDelete(vaccine)} /></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f7faf7] px-4 py-3"><span className="text-sm text-[#68766e]">次回接種予定</span><b className={urgent ? 'text-[#b87b1e]' : 'text-[#426e50]'}>{formatDate(vaccine.next)}</b></div>{vaccine.memo && <p className="mt-3 text-xs text-[#849189]">メモ：{vaccine.memo}</p>}</article>})}</div> : <EmptyState label="ワクチン予定はまだありません" actionLabel="ワクチン予定を登録" onAdd={onAdd} />}</div>
}

function CalendarView({ month, onMonth, vaccines, pets }: { month: Date; onMonth: (date: Date) => void; vaccines: Vaccine[]; pets: Pet[] }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1); const offset = start.getDay(); const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const byDate = new Map<string, { vaccine: Vaccine; pet?: Pet }[]>()
  vaccines.forEach((vaccine) => { const key = vaccine.next; byDate.set(key, [...(byDate.get(key) ?? []), { vaccine, pet: pets.find((pet) => pet.id === vaccine.petId) }]) })
  const selectedMonthVaccines = vaccines.filter((vaccine) => { const [year, monthNumber] = vaccine.next.split('-').map(Number); return year === month.getFullYear() && monthNumber === month.getMonth() + 1 }).sort((a, b) => a.next.localeCompare(b.next))
  return <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-[#e3ebe4] bg-white p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="前の月" className="rounded-lg p-2 hover:bg-[#f2f6f2]"><ChevronLeft size={19} /></button><h2 className="font-semibold">{month.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</h2><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="次の月" className="rounded-lg p-2 hover:bg-[#f2f6f2]"><ChevronRight size={19} /></button></div><div className="grid grid-cols-7 gap-1 text-center">{['日', '月', '火', '水', '木', '金', '土'].map((day) => <span key={day} className="py-2 text-xs font-medium text-[#89968d]">{day}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: dayCount }, (_, index) => { const day = index + 1; const dateKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const hasEvent = byDate.has(dateKey); return <div key={day} className={`min-h-12 rounded-xl py-2 text-sm ${hasEvent ? 'bg-[#e7f3e9] font-semibold text-[#36724f]' : 'text-[#68766e]'}`}><span>{day}</span>{hasEvent && <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-[#5d9870]" />}</div>})}</div></section><section><h2 className="mb-3 font-semibold">今月の予定</h2>{selectedMonthVaccines.length ? <div className="space-y-3">{selectedMonthVaccines.map((vaccine) => <article key={vaccine.id} className="rounded-2xl border border-[#e3ebe4] bg-white p-4"><p className="text-xs font-semibold text-[#568064]">{formatDate(vaccine.next)}</p><h3 className="mt-1 text-sm font-semibold">{vaccine.name}</h3><p className="mt-1 text-xs text-[#839087]">{pets.find((pet) => pet.id === vaccine.petId)?.name ?? 'ペット'}の接種予定</p></article>)}</div> : <EmptyState label="この月のワクチン予定はありません" />}</section></div>
}

function SettingsView({ ownerName, reminderDays, notificationsEnabled, onName, onDays, onEnable, onDisable }: { ownerName: string; reminderDays: number; notificationsEnabled: boolean; onName: (name: string) => void; onDays: (days: number) => void; onEnable: () => void; onDisable: () => void }) {
  const [draftName, setDraftName] = useState(ownerName)
  useEffect(() => setDraftName(ownerName), [ownerName])
  return <div className="max-w-2xl space-y-5"><section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 sm:p-7"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#e5f2e7] p-2.5 text-[#36724f]"><Bell size={20} /></span><div><h2 className="font-semibold">ワクチン通知</h2><p className="mt-1 text-sm leading-6 text-[#78867d]">予定日の何日前から通知するか選びます。通知にはブラウザーの許可が必要です。</p></div></div><label className="mt-6 block"><span className="mb-2 block text-sm font-medium">通知するタイミング</span><select value={reminderDays} onChange={(event) => onDays(Number(event.target.value))} className="h-12 w-full rounded-xl border border-[#dce5dd] bg-white px-4 text-sm"><option value={1}>1日前</option><option value={3}>3日前</option><option value={7}>7日前</option><option value={14}>14日前</option><option value={30}>30日前</option></select></label><div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#f7faf7] p-4"><span><b className="block text-sm">ブラウザー通知</b><span className="mt-1 block text-xs text-[#839087]">{notificationsEnabled ? '有効' : '未設定'}</span></span>{notificationsEnabled ? <button onClick={onDisable} className="rounded-lg border border-[#dce5dd] bg-white px-4 py-2 text-sm">通知を停止</button> : <button onClick={onEnable} className="rounded-lg bg-[#36724f] px-4 py-2 text-sm font-semibold text-white">通知を許可する</button>}</div><p className="mt-4 text-xs leading-5 text-[#89968d]">通知はこのページを開いている間に表示されます。ページを閉じた状態での通知には、プッシュ通知サービスのサーバー連携が必要です。</p></section><section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 sm:p-7"><div className="flex items-center gap-2"><UserRound size={19} className="text-[#36724f]" /><h2 className="font-semibold">飼い主プロフィール</h2></div><label className="mt-5 block"><span className="mb-2 block text-sm font-medium">表示名</span><div className="flex gap-2"><input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[#dce5dd] px-3 text-sm" /><button onClick={() => onName(draftName.trim() || '飼い主さん')} className="rounded-xl bg-[#36724f] px-4 text-sm font-semibold text-white">保存</button></div></label></section></div>
}

function EmptyState({ label, actionLabel, onAdd }: { label: string; actionLabel?: string; onAdd?: () => void }) { return <div className="rounded-2xl border border-dashed border-[#ccdacf] bg-white px-5 py-12 text-center"><ClipboardPlus className="mx-auto text-[#9db5a2]" size={32} /><p className="mt-3 text-sm text-[#78867d]">{label}</p>{onAdd && <button onClick={onAdd} className="mt-4 rounded-lg bg-[#36724f] px-4 py-2.5 text-sm font-semibold text-white">＋ {actionLabel ?? '記録を追加'}</button>}</div> }

function RecordForm({ type, pet, visit, vaccine, onType, onVisit, onVaccine, onCancel }: { type: 'visit' | 'vaccine'; pet: Pet; visit?: Visit; vaccine?: Vaccine; onType: (type: 'visit' | 'vaccine') => void; onVisit: (event: FormEvent<HTMLFormElement>) => void; onVaccine: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const editing = Boolean(visit || vaccine)
  return <div className="max-w-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editing ? '記録を編集' : '新しい記録'}</h2><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-[#718077] hover:bg-[#edf4ee]">キャンセル</button></div><div className="mb-5 flex gap-2 rounded-xl bg-[#e9f0ea] p-1"><button type="button" disabled={Boolean(visit)} onClick={() => onType('visit')} className={`flex-1 rounded-lg py-3 text-sm font-medium disabled:cursor-not-allowed ${type === 'visit' ? 'bg-white text-[#36724f] shadow-sm' : 'text-[#89968d]'}`}><Stethoscope className="mr-2 inline" size={17} />通院・健康記録</button><button type="button" disabled={Boolean(vaccine)} onClick={() => onType('vaccine')} className={`flex-1 rounded-lg py-3 text-sm font-medium disabled:cursor-not-allowed ${type === 'vaccine' ? 'bg-white text-[#36724f] shadow-sm' : 'text-[#89968d]'}`}><Syringe className="mr-2 inline" size={17} />ワクチン予定</button></div><form onSubmit={type === 'visit' ? onVisit : onVaccine} className="space-y-5 rounded-2xl border border-[#e3ebe4] bg-white p-5 sm:p-7"><p className="text-sm text-[#718077]">記録するペット：<b className="text-[#27352d]">{pet.icon} {pet.name}</b></p>{type === 'visit' ? <><FormInput label="通院日" name="date" type="date" required defaultValue={visit?.date} /><FormInput label="病院名" name="hospital" placeholder={pet.hospital || '病院名'} required defaultValue={visit?.hospital} /><FormInput label="診察・通院カテゴリ" name="purpose" placeholder="定期健診" required defaultValue={visit?.purpose} /><FormInput label="体重（kg）" name="weight" type="number" step="0.1" placeholder="8.4" defaultValue={visit?.weight} /><FormInput label="メモ" name="memo" placeholder="診察内容や気になったこと" defaultValue={visit?.memo} />{visit?.attachments.length ? <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">保存済みの添付ファイル</legend>{visit.attachments.map((file, index) => <label key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-[#f7faf7] p-3 text-sm text-[#68766e]"><input type="checkbox" name="keepAttachments" value={index} defaultChecked className="accent-[#36724f]" /><FileText size={15} />{file.name}<span className="ml-auto text-xs">保持</span></label>)}<p className="text-xs text-[#89968d]">チェックを外すと、この記録から添付を削除します。</p></fieldset> : null}<label className="block"><span className="mb-2 block text-sm font-medium">診療明細・写真・証明書</span><input name="attachments" type="file" accept="image/*,.pdf" multiple className="block w-full rounded-xl border border-[#dce5dd] bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f3e9] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#36724f]" /><span className="mt-2 block text-xs leading-5 text-[#89968d]">画像またはPDF、1ファイル3MBまで。添付データはこのブラウザー内に保存されます。</span></label></> : <><FormInput label="ワクチン名・種類" name="name" placeholder="混合ワクチン（5種）" required defaultValue={vaccine?.name} /><FormInput label="接種日" name="date" type="date" required defaultValue={vaccine?.date} /><FormInput label="次回接種予定日" name="next" type="date" required defaultValue={vaccine?.next} /><FormInput label="メモ" name="memo" placeholder="接種時の注意点など" defaultValue={vaccine?.memo} /></>}<button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#36724f] text-sm font-semibold text-white"><Plus size={17} />{editing ? '変更を保存' : '記録を保存'}</button></form></div>
}

function FormInput({ label, name, type = 'text', placeholder, required, step, defaultValue }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; step?: string; defaultValue?: string }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input name={name} type={type} placeholder={placeholder} required={required} step={step} defaultValue={defaultValue} className="h-12 w-full rounded-xl border border-[#dce5dd] bg-white px-4 text-sm outline-none focus:border-[#75a486] focus:ring-4 focus:ring-[#e1f0e4]" /></label> }

function AddPetModal({ pet, onClose, onSubmit }: { pet?: Pet; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center overflow-y-auto bg-[#203429]/40 p-0 sm:items-center sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="add-pet-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-xs font-semibold tracking-wider text-[#6f997a]">ペットプロフィール</p><h2 id="add-pet-title" className="mt-1 text-xl font-semibold">{pet ? 'プロフィールを編集' : '家族の情報を登録'}</h2></div>
          <button type="button" onClick={onClose} aria-label="閉じる" className="rounded-lg p-2 text-[#87948b] hover:bg-[#f1f5f1]"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormInput label="ペット名" name="name" placeholder="例：ポチ" required defaultValue={pet?.name} />
          <FormInput label="種類" name="species" placeholder="犬 / 猫" required defaultValue={pet?.species} />
          <FormInput label="品種" name="breed" placeholder="例：柴犬" defaultValue={pet?.breed} />
          <FormInput label="性別" name="gender" placeholder="オス / メス" defaultValue={pet?.gender} />
          <FormInput label="生年月日" name="birth" type="date" defaultValue={pet?.birth} />
          <FormInput label="アイコン（絵文字）" name="icon" placeholder="🐕" defaultValue={pet?.icon} />
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-medium">プロフィール写真（任意）</span><input name="photo" type="file" accept="image/*" className="block w-full rounded-xl border border-[#dce5dd] bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f3e9] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#36724f]" /><span className="mt-2 block text-xs text-[#89968d]">画像ファイル、1MB以下</span></label>
          <FormInput label="アレルギー・持病" name="allergies" placeholder="なければ空欄" defaultValue={pet?.allergies} />
          <FormInput label="かかりつけ病院" name="hospital" placeholder="病院名" defaultValue={pet?.hospital} />
          <div className="sm:col-span-2"><FormInput label="健康メモ" name="profileNote" placeholder="食事やケアで気をつけること" defaultValue={pet?.profileNote} /></div>
          <button className="h-12 rounded-xl bg-[#36724f] text-sm font-semibold text-white sm:col-span-2">{pet ? '変更を保存' : '登録して使い始める'}</button>
        </form>
        <p className="mt-4 text-xs text-[#89968d]">プロフィールや写真はこのブラウザー内に保存されます。</p>
      </div>
    </div>
  )
}

function DeleteConfirmation({ target, relatedCounts, onCancel, onConfirm }: { target: DeleteTarget; relatedCounts?: { visits: number; vaccines: number }; onCancel: () => void; onConfirm: () => void }) {
  const title = target.kind === 'pet'
    ? `「${target.value.name}」を削除しますか？`
    : target.kind === 'visit'
      ? `「${target.value.hospital}」の通院記録を削除しますか？`
      : `「${target.value.name}」のワクチン記録を削除しますか？`
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#203429]/45 p-0 sm:items-center sm:p-5"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description" className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ee] text-[#b44f48]"><Trash2 size={20} /></span><h2 id="delete-confirm-title" className="mt-4 text-lg font-semibold">{title}</h2><p id="delete-confirm-description" className="mt-2 text-sm leading-6 text-[#748078]">この操作は取り消せません。{target.kind === 'pet' && relatedCounts ? `関連する通院記録${relatedCounts.visits}件、ワクチン記録${relatedCounts.vaccines}件も一緒に削除されます。` : '記録の内容と添付ファイルも削除されます。'}</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="h-11 rounded-xl border border-[#dce5dd] px-4 text-sm font-semibold text-[#536259] hover:bg-[#f7faf7]">キャンセル</button><button type="button" onClick={onConfirm} className="h-11 rounded-xl bg-[#b84f48] px-4 text-sm font-semibold text-white hover:bg-[#9e403a]">削除する</button></div></section></div>
}
