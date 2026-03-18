<script>
    // 1. 방금 만드신 단과대/학과 데이터를 불러옵니다.
    import { universityData } from '$lib/data/majors';

    // 2. 선택된 값을 저장할 Svelte 5 반응형 상태($state)
    let selectedCollege = $state('');
    let selectedDepartment = $state('');

    // 3. 단과대학이 선택되면 자동으로 해당 학과 목록을 가져옵니다 ($derived)
    let departments = $derived(selectedCollege ? universityData[selectedCollege] : []);
</script>

<div class="pt-6 border-t border-gray-100">
    <p class="text-sm font-bold text-gray-700 mb-1">소속 <span class="text-[#8B0029] font-normal text-xs ml-1">('만나볼텨?' 이용 시 필수)</span></p>
    <p class="text-[11px] text-[#8B0029] font-bold bg-red-50 p-2 rounded-lg mb-3">
        💡 '만나볼텨?' (매칭 서비스)를 이용하시려면 단과대학 및 학과 입력이 필수입니다!
    </p>
    
    <div class="space-y-3">
        <input type="text" name="nickname" placeholder="닉네임 (2~10자)" required minlength="2" maxlength="10" class="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm" />
        
        <div class="flex gap-2">
            <select name="grade" required class="flex-1 appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm">
                <option value="" selected disabled>학년 선택 (필수)</option>
                {#each ['1학년', '2학년', '3학년', '4학년', '대학원생', '졸업생', '기타'] as g}
                    <option value={g}>{g}</option>
                {/each}
            </select>

            <input type="number" name="birthYear" required placeholder="출생연도 (예: 2001)" min="1950" max="2010" class="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm" />
        </div>

        <div class="flex gap-2">
            {#each [{val:'MALE', label:'남자'}, {val:'FEMALE', label:'여자'}] as g}
                <label class="flex-1 relative">
                    <input type="radio" name="gender" value={g.val} class="peer hidden" required />
                    <div class="w-full text-center py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-500 peer-checked:bg-red-50 peer-checked:text-[#8B0029] peer-checked:border-[#8B0029] cursor-pointer transition-all">
                        {g.label}
                    </div>
                </label>
            {/each}
        </div>

        <div class="relative mt-2">
            <select name="college" bind:value={selectedCollege} class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm text-gray-900">
                <option value="" selected>단과대학 (선택 안 함)</option>
                {#each Object.keys(universityData) as college}
                    <option value={college}>{college}</option>
                {/each}
            </select>
        </div>

        <div class="relative">
            <select name="department" bind:value={selectedDepartment} disabled={!selectedCollege} class="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-red-200">
                <option value="" selected>학과 (선택 안 함)</option>
                {#each departments as dept}
                    <option value={dept}>{dept}</option>
                {/each}
            </select>
        </div>
    </div>
</div>

<div class="pt-6 border-t border-gray-100">
    <p class="text-sm font-bold text-gray-700 mb-2">연락처 <span class="text-[#8B0029] font-normal text-xs ml-1">('만나볼텨?' 이용 시 필수)</span></p>
    
    <p class="text-[11px] text-[#8B0029] font-bold bg-red-50 p-2 rounded-lg mb-3">
        💡 매칭 성사 시 연락을 위해 <strong>카카오톡 ID 또는 인스타그램 ID 중 하나만</strong> 입력하셔도 됩니다!
    </p>

    <div class="flex flex-col gap-3">
        <input type="text" name="kakaoId" placeholder="카카오톡 ID (예: golabau123)" class="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm" />
        <input type="text" name="instaId" placeholder="인스타그램 ID (예: @golabau_official)" class="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200 text-sm" />
    </div>
</div>