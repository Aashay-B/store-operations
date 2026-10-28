"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

type Props = { onDetected:(code:string)=>void; onClose:()=>void };

export default function BarcodeScanner({ onDetected, onClose }:Props){
 const videoRef=useRef<HTMLVideoElement>(null); const [error,setError]=useState("");
 useEffect(()=>{ let controls:IScannerControls|undefined; let cancelled=false;
  (async()=>{
   if(!navigator.mediaDevices?.getUserMedia){ setError("Camera access isn’t available. Open the site over HTTPS, or type the item number instead."); return; }
   try {
    const [{ BrowserMultiFormatReader },{ BarcodeFormat, DecodeHintType }]=await Promise.all([import("@zxing/browser"),import("@zxing/library")]);
    const hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.CODE_128,BarcodeFormat.CODE_39,BarcodeFormat.ITF]]]);
    const reader=new BrowserMultiFormatReader(hints);
    const c=await reader.decodeFromConstraints({ video:{ facingMode:{ ideal:"environment" } } },videoRef.current!,(result,_err,ctl)=>{ if(result){ ctl.stop(); navigator.vibrate?.(80); onDetected(result.getText()); } });
    if(cancelled) c.stop(); else controls=c;
   } catch(e){ if(!cancelled) setError(e instanceof DOMException&&e.name==="NotAllowedError"?"Camera permission was denied. Allow camera access in your browser settings and try again.":"Couldn’t start the camera. You can type the item number instead."); }
  })();
  return ()=>{ cancelled=true; controls?.stop(); };
 },[onDetected]);
 useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); }; window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey); },[onClose]);
 return <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Scan barcode" onClick={onClose}><div className="scanner" onClick={e=>e.stopPropagation()}><div className="scanner-head"><b>Scan barcode</b><button type="button" className="scanner-close" onClick={onClose} aria-label="Close scanner"><X size={18}/></button></div>{error?<p className="scanner-error">{error}</p>:<div className="scanner-view"><video ref={videoRef} muted playsInline/><span className="scanner-guide"/></div>}<p className="scanner-hint">Point the camera at the item’s barcode. It will fill in automatically.</p></div></div>
}
