export const RESERVE_DAYS=60;
export const periodKey=(time:number)=>new Date(time).toISOString().slice(0,7);
export function allocation(netRevenueCents:number,eligibleAcademies:number){const net=Math.max(0,Math.trunc(netRevenueCents)),operations=Math.floor(net*90/100),founder=Math.floor(net*2/100),pool=net-operations-founder,share=eligibleAcademies?Math.floor(pool/eligibleAcademies):0,remainder=pool-share*eligibleAcademies;return{net,operations,founder,pool,share,remainder}}
