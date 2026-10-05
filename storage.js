const KEY='lantern-duet-v1';
export function loadProgress(storage){try{const v=JSON.parse(storage.getItem(KEY));if(v&&v.version===1&&Number.isInteger(v.level)&&v.level>=0&&v.level<8&&typeof v.complete==='boolean')return v;}catch{}return {version:1,level:0,complete:false};}
export function saveProgress(storage,level,complete=false){if(!Number.isInteger(level)||level<0||level>7)return false;try{storage.setItem(KEY,JSON.stringify({version:1,level,complete:!!complete}));return true;}catch{return false;}}
