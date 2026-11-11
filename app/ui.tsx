'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
export const money=(n:number)=>fmt(n)+'đ';
export const date=(s:string)=>new Date(s.slice(0,19)).toLocaleDateString('vi-VN');
export async function api(action:string,token='',body?:unknown){const response=await fetch('/api/membership?action='+action,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});const data:any=await response.json();if(!response.ok)throw Error(data.error||'Không thể kết nối.');return data}
export function Modal({children,onClose,title}:{children:ReactNode;onClose:()=>void;title:string}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal()},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-title"><h2>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20}/></button></div>{children}</dialog>}


