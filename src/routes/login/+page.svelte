<script>
    import { MessageCircle } from 'lucide-svelte';
    let { data } = $props();
    
    // 🔥 서버에서 완성해서 넘겨준 URL을 그대로 받아서 사용합니다!
    // (더 이상 프론트엔드에 카카오 클라이언트 ID가 노출되지 않음)
    const kakaoLoginUrl = data.kakaoAuthUrl;
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-white p-6 pb-24">
    <div class="text-center mb-10">
        <h1 class="text-3xl font-extrabold text-gray-900 mb-2">골라바유<span class="text-red-500">.</span></h1>
        <p class="text-gray-500 text-sm">결정장애를 위한 맛집 추천 커뮤니티</p>
    </div>

    <a href={kakaoLoginUrl} class="w-full max-w-sm bg-[#FEE500] hover:bg-[#FDD835] text-black/85 font-semibold rounded-xl py-4 px-6 flex items-center justify-center gap-3 transition-colors">
        <div class="w-5 h-5 flex items-center justify-center">
            <MessageCircle class="fill-black border-none" size={20} />
        </div>
        <span>카카오로 3초 만에 시작하기</span>
    </a>
    
    <p class="mt-6 text-xs text-gray-400 text-center">
        로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
    </p>
</div>