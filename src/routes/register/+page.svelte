<script>
    import { enhance } from '$app/forms';
    import { universityData } from '$lib/data/majors';

    // 1. 출생연도 리스트 (현재 연도 기준)
    const currentYear = new Date().getFullYear();
    const birthYears = Array.from({ length: 60 }, (_, i) => currentYear - 15 - i);

    // 2. 단과대 선택 로직
    let selectedCollege = ''; 
    let departments = [];

    // 단과대가 바뀌면 학과 목록 업데이트
    $: departments = selectedCollege ? universityData[selectedCollege] : [];
</script>

<div class="min-h-screen bg-white p-6 flex flex-col justify-center max-w-md mx-auto">
    <div class="mb-8">
        <h1 class="text-2xl font-bold mb-2">조금만 더 알려주세요! 🕵️</h1>
        <p class="text-gray-500 text-sm">
            입력된 정보는 더 정확한 맛집 추천과 분석을 위해서만 사용됩니다.<br>
            <span class="text-red-500 font-bold">* 표시는 필수 항목입니다.</span>
        </p>
    </div>

    <form method="POST" use:enhance class="space-y-8">
        
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
            <p class="text-xs text-gray-400 mt-1 pl-1">* 성별을 꼭 선택해주세요.</p>
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

        <button type="submit" class="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors mt-8 shadow-lg shadow-red-200 text-lg">
            시작하기
        </button>
    </form>
</div>