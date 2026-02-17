<script>
    import { enhance } from '$app/forms';
    import { universityData } from '$lib/data/majors';
    import { fade, fly } from 'svelte/transition'; // 모달 애니메이션용

    // 1. 출생연도 리스트 (현재 연도 기준)
    const currentYear = new Date().getFullYear();
    const birthYears = Array.from({ length: 60 }, (_, i) => currentYear - 15 - i);

    // 2. 단과대 선택 로직
    let selectedCollege = ''; 
    let departments = [];

    // 단과대가 바뀌면 학과 목록 업데이트
    $: departments = selectedCollege ? universityData[selectedCollege] : [];
    
    // 3. 서버에서 에러 메시지(닉네임 짧음 등) 오면 받기
    export let form; 

    // [추가] 약관 동의 상태 관리
    let isAgreed = false;
    let isPolicyModalOpen = false;
</script>

<div class="min-h-screen bg-white p-6 flex flex-col justify-center max-w-md mx-auto relative">
    <div class="mb-8">
        <h1 class="text-2xl font-bold mb-2 font-['Jua']">조금만 더 알려주세요! 🕵️</h1>
        <p class="text-gray-500 text-sm">
            입력된 정보는 더 정확한 맛집 추천과 분석을 위해서만 사용됩니다.<br>
            <span class="text-red-500 font-bold">* 표시는 필수 항목입니다.</span>
        </p>
    </div>

    <form method="POST" use:enhance class="space-y-8 pb-10">
        
        <div>
            <label for="nickname" class="block text-sm font-bold text-gray-700 mb-2">닉네임 <span class="text-red-500">*</span></label>
            <input 
                type="text" 
                name="nickname" 
                id="nickname" 
                placeholder="닉네임을 지어주세요 (2~10자)"
                minlength="2"
                maxlength="10"
                required
                class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow placeholder-gray-400 text-gray-900"
            />
            {#if form?.message}
                <p class="text-red-500 text-sm mt-1 font-bold">⚠️ {form.message}</p>
            {/if}
        </div>

        <div>
            <label for="grade" class="block text-sm font-bold text-gray-700 mb-2">학년 <span class="text-red-500">*</span></label>
            <div class="relative">
                <select name="grade" id="grade" required class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow invalid:text-gray-400">
                    <option value="" disabled selected>학년을 선택해주세요</option>
                    <option value="1학년" class="text-gray-900">1학년</option>
                    <option value="2학년" class="text-gray-900">2학년</option>
                    <option value="3학년" class="text-gray-900">3학년</option>
                    <option value="4학년" class="text-gray-900">4학년</option>
                    <option value="5학년 이상" class="text-gray-900">5학년 이상</option>
                    <option value="휴학/졸업" class="text-gray-900">휴학/졸업/기타</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        <div>
            <label for="birthYear" class="block text-sm font-bold text-gray-700 mb-2">출생연도 <span class="text-red-500">*</span></label>
            <div class="relative">
                <select name="birthYear" id="birthYear" required class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow invalid:text-gray-400">
                    <option value="" disabled selected>태어난 연도를 선택해주세요</option>
                    {#each birthYears as year}
                        <option value={year} class="text-gray-900">{year}년생</option>
                    {/each}
                </select>
                 <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">성별 <span class="text-red-500">*</span></label>
            <div class="flex gap-4">
                <label class="flex-1 cursor-pointer group">
                    <input type="radio" name="gender" value="male" required class="peer sr-only">
                    <div class="text-center py-3 rounded-xl border border-gray-200 
                                peer-checked:bg-blue-50 peer-checked:border-blue-500 peer-checked:text-blue-600 
                                group-hover:bg-gray-50 font-medium transition-all">
                        남성
                    </div>
                </label>
                <label class="flex-1 cursor-pointer group">
                    <input type="radio" name="gender" value="female" class="peer sr-only">
                    <div class="text-center py-3 rounded-xl border border-gray-200 
                                peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-600 
                                group-hover:bg-gray-50 font-medium transition-all">
                        여성
                    </div>
                </label>
            </div>
        </div>

        <div class="pt-6 border-t border-gray-100">
            <p class="text-sm font-bold text-gray-700 mb-2">소속 <span class="text-gray-400 font-normal text-xs ml-1">(선택사항)</span></p>
            
            <div class="space-y-3">
                <div class="relative">
                    <select 
                        name="college" 
                        bind:value={selectedCollege} 
                        class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm text-gray-900"
                    >
                        <option value="" selected>단과대학 (선택 안 함)</option>
                        {#each Object.keys(universityData) as college}
                            <option value={college}>{college}</option>
                        {/each}
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <div class="relative">
                    <select 
                        name="department" 
                        disabled={!selectedCollege}
                        class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-red-200"
                    >
                        <option value="" selected>학과 (선택 안 함)</option>
                        {#each departments as dept}
                            <option value={dept}>{dept}</option>
                        {/each}
                    </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
        </div>

        <div class="pt-4">
            <label class="flex items-start gap-2 cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    bind:checked={isAgreed}
                    class="w-5 h-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" 
                />
                <span class="text-xs text-gray-600 leading-snug">
                    <span class="text-red-500 font-bold">[필수]</span> 
                    서비스 이용을 위한 
                    <button type="button" onclick={() => isPolicyModalOpen = true} class="underline font-bold text-gray-800 hover:text-red-600">
                        개인정보 수집 및 이용
                    </button>
                    에 동의합니다.
                </span>
            </label>
        </div>

        <button 
            type="submit" 
            disabled={!isAgreed}
            class="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 text-lg disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
        >
            시작하기
        </button>
    </form>

    {#if isPolicyModalOpen}
        <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" 
             onclick={() => isPolicyModalOpen = false}
             transition:fade>
            <div class="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto relative" 
                 onclick={(e) => e.stopPropagation()}
                 transition:fly={{ y: 20 }}>
                
                <h3 class="font-bold text-lg mb-4 text-gray-900 border-b border-gray-100 pb-2">개인정보 처리방침 🛡️</h3>
                
                <div class="text-xs text-gray-600 space-y-4 leading-relaxed font-medium">
                    <div>
                        <p class="font-bold text-gray-800 mb-1">1. 수집하는 개인정보 항목</p>
                        <ul class="list-disc pl-4 space-y-0.5 text-gray-500">
                            <li>필수: 닉네임, 학년, 출생연도, 성별</li>
                            <li>선택: 단과대, 학과, 이메일(문의 시)</li>
                        </ul>
                    </div>

                    <div>
                        <p class="font-bold text-gray-800 mb-1">2. 수집 및 이용 목적</p>
                        <ul class="list-disc pl-4 space-y-0.5 text-gray-500">
                            <li>서비스 가입 및 본인 식별</li>
                            <li>맞춤형 맛집 추천 및 분석 통계 제공</li>
                            <li>커뮤니티(리뷰, 댓글) 운영 및 불량 이용자 제재</li>
                        </ul>
                    </div>

                    <div>
                        <p class="font-bold text-gray-800 mb-1">3. 보유 및 이용 기간</p>
                        <p class="text-gray-500">회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 수집된 개인정보는 지체 없이 파기합니다.</p>
                    </div>
                    
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                        <p class="text-[10px] text-gray-400">
                            * 본 서비스는 대학생 개발 프로젝트이며, 수집된 정보는 서비스 제공 및 포트폴리오 학습 목적으로만 사용됩니다.
                        </p>
                    </div>
                </div>

                <button 
                    onclick={() => isPolicyModalOpen = false} 
                    class="w-full mt-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors"
                >
                    확인했습니다
                </button>
            </div>
        </div>
    {/if}

</div>