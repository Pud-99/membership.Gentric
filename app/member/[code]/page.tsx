import Club from '../../club';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <Club code={code}/>}

