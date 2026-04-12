<script>
    import { MessageCircle } from 'lucide-svelte';

    let { data } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-white p-6 pb-24">
    <div class="mb-10 text-center">
        <h1 class="mb-2 text-3xl font-extrabold text-gray-900">골라봐유<span class="text-red-500">.</span></h1>
        <p class="text-sm text-gray-500">계정 하나로 시작하는 우리 학교 맛집 커뮤니티</p>
    </div>

    {#if data.loginError}
        <div class="mb-4 w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {data.loginError}
        </div>
    {/if}

    <a
        href={data.kakaoAuthUrl}
        class="flex w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-6 py-4 font-semibold text-black/85 transition-colors hover:bg-[#FDD835]"
    >
        <div class="flex h-5 w-5 items-center justify-center">
            <MessageCircle class="fill-black" size={20} />
        </div>
        <span>카카오로 3초 만에 시작하기</span>
    </a>

    <p class="mt-6 text-center text-xs text-gray-400">
        로그인하면 이용약관 및 개인정보처리방침에 동의한 것으로 간주됩니다.
    </p>
</div>
