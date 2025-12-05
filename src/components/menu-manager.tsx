'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Trash2, Save, X, Edit2, Menu } from 'lucide-react'
import { Database } from '@/types/supabase'

type MenuItemRow = Database['public']['Tables']['menu_items']['Row']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

type MenuForm = {
    id?: string
    label: string
    href: string
    order: number
}

export default function MenuManager() {
    const [menuItems, setMenuItems] = useState<MenuItemRow[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<MenuForm>({ label: '', href: '', order: 0 })
    const [isAdding, setIsAdding] = useState(false)
    const supabase = createClient()

    const loadMenuItems = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*')
                .order('order', { ascending: true })

            if (error && error.code !== 'PGRST116') { // Table doesn't exist
                console.error('Error loading menu items:', error)
                // Initialize with default items if table doesn't exist
                const now = new Date().toISOString()
                const fallback: MenuItemRow[] = [
                    { id: 'fallback-1', label: '홈', href: '/', order: 1, created_at: now },
                    { id: 'fallback-2', label: '서비스 소개', href: '/about', order: 2, created_at: now },
                    { id: 'fallback-3', label: '문의하기', href: '/contact', order: 3, created_at: now },
                ]
                setMenuItems(fallback)
            } else {
                setMenuItems((data ?? []) as MenuItemRow[])
            }
        } catch (error) {
            console.error('Error loading menu items:', error)
        }
    }, [supabase])

    useEffect(() => {
        loadMenuItems()
    }, [loadMenuItems])

    const handleSave = async () => {
        try {
            if (editingId) {
                // Update existing item
                const updatePayload: MenuItemUpdate = {
                    label: editForm.label,
                    href: editForm.href,
                    order: editForm.order,
                }

                const { error } = await supabase
                    .from('menu_items')
                    .update(updatePayload)
                    .eq('id', editingId)

                if (error) throw error
            } else {
                // Create new item
                const insertPayload: MenuItemInsert = {
                    label: editForm.label,
                    href: editForm.href,
                    order: editForm.order,
                }

                const { error } = await supabase
                    .from('menu_items')
                    .insert([insertPayload])

                if (error) throw error
            }

            await loadMenuItems()
            setEditingId(null)
            setIsAdding(false)
            setEditForm({ label: '', href: '', order: 0 })
            alert('저장되었습니다.')
        } catch (error: unknown) {
            console.error('Error saving menu item:', error)
            if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '42P01') { // Table doesn't exist
                alert('메뉴 테이블이 존재하지 않습니다. 데이터베이스에 menu_items 테이블을 생성해주세요.')
            } else {
                alert('저장 중 오류가 발생했습니다.')
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', id)

            if (error) throw error

            await loadMenuItems()
            alert('삭제되었습니다.')
        } catch (error: unknown) {
            console.error('Error deleting menu item:', error)
            alert('삭제 중 오류가 발생했습니다.')
        }
    }

    const startEdit = (item: MenuItemRow) => {
        setEditingId(item.id || null)
        setEditForm({
            id: item.id,
            label: item.label,
            href: item.href,
            order: item.order,
        })
        setIsAdding(false)
    }

    const startAdd = () => {
        setIsAdding(true)
        setEditingId(null)
        setEditForm({ label: '', href: '', order: menuItems.length + 1 })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setIsAdding(false)
        setEditForm({ label: '', href: '', order: 0 })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">메뉴 관리</h2>
                    <p className="text-gray-500 text-sm mt-1">사이트 네비게이션 메뉴를 관리합니다</p>
                </div>
                <button
                    onClick={startAdd}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" />
                    메뉴 추가
                </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/60">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-800/95 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    순서
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    메뉴명
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    링크
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    관리
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-950/30 divide-y divide-slate-800/40">
                            {isAdding && (
                                <tr className="bg-gray-800/30">
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            value={editForm.order}
                                            onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 0 })}
                                            className="w-20 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={editForm.label}
                                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                            placeholder="메뉴명"
                                            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={editForm.href}
                                            onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                                            placeholder="/경로"
                                            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSave}
                                                className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                                title="저장"
                                            >
                                                <Save className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                                                title="취소"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {menuItems.length === 0 && !isAdding ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                                <Menu className="h-8 w-8 text-slate-500" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium">메뉴 항목이 없습니다. 메뉴를 추가해주세요.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                menuItems.map((item) => (
                                    <tr key={item.id || item.order} className="hover:bg-slate-800/50 transition-all duration-200 group border-b border-slate-800/30">
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                            {editingId === item.id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.order}
                                                    onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 0 })}
                                                    className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                item.order
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-50 group-hover:text-white">
                                            {editingId === item.id ? (
                                                <input
                                                    type="text"
                                                    value={editForm.label}
                                                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                item.label
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                            {editingId === item.id ? (
                                                <input
                                                    type="text"
                                                    value={editForm.href}
                                                    onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <a href={item.href} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                                                    {item.href}
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {editingId === item.id ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleSave}
                                                        className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                                        title="저장"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="취소"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {item.id && (
                                                        <button
                                                            onClick={() => handleDelete(item.id!)}
                                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

