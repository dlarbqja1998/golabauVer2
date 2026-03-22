<script lang="ts">
	import { universityData } from '$lib/data/majors';

	let { form } = $props();

	const gradeOptions = ['1학년', '2학년', '3학년', '4학년', '5학년 이상', '졸업생', '기타'];
	const birthYearOptions = Array.from({ length: 21 }, (_, index) => 2010 - index);
	const contactOptions = [
		{ value: 'kakao', label: '카카오톡' },
		{ value: 'insta', label: '인스타' }
	] as const;

	let selectedCollege = $state(form?.college ?? '');
	let selectedDepartment = $state(form?.department ?? '');
	let selectedContactType = $state(form?.contactType ?? 'kakao');
	let departments = $derived(selectedCollege ? universityData[selectedCollege] ?? [] : []);
	let contactPlaceholder = $derived(
		selectedContactType === 'kakao' ? '카카오톡 ID를 입력해 주세요.' : '인스타그램 ID를 입력해 주세요.'
	);
</script>

<svelte:head>
	<title>온보딩 | 골라바유</title>
</svelte:head>

<div class="min-h-screen bg-[#F8F9FA] px-6 py-8 pb-28">
	<div class="mx-auto w-full max-w-md">
		<div class="mb-8">
			<h1 class="font-['Jua'] text-[1.8rem] tracking-tight text-black">조금만 더 알려주세요!</h1>
			<p class="mt-3 text-[14px] leading-6 text-gray-600">
				입력된 정보는 더 정확한 맛집 추천과 분석을 위해서만 사용됩니다.
			</p>
			<p class="mt-1 text-[14px] font-bold text-[#E53935]">*표시는 필수 항목입니다.</p>
			<p class="mt-4 rounded-2xl bg-[#FFF1F3] px-4 py-3 text-[13px] font-bold leading-5 text-[#8B0029]">
				만나볼텨?를 이용하려면 소속과 연락처 입력이 필수입니다.
			</p>
		</div>

		{#if form?.message}
			<div class="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
				{form.message}
			</div>
		{/if}

		<form method="POST" class="space-y-7">
			<div class="space-y-2">
				<label for="nickname" class="font-['Jua'] text-[15px] text-black">닉네임 <span class="text-[#E53935]">*</span></label>
				<input
					id="nickname"
					name="nickname"
					type="text"
					required
					maxlength="10"
					value={form?.nickname ?? ''}
					placeholder="최대 10글자까지 입력해 주세요."
					class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
				/>
			</div>

			<div class="space-y-2">
				<label for="grade" class="font-['Jua'] text-[15px] text-black">학년 <span class="text-[#E53935]">*</span></label>
				<select
					id="grade"
					name="grade"
					required
					class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
				>
					<option value="" disabled selected={!form?.grade}>학년을 선택해 주세요.</option>
					{#each gradeOptions as grade}
						<option value={grade} selected={form?.grade === grade}>{grade}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label for="birthYear" class="font-['Jua'] text-[15px] text-black">출생연도 <span class="text-[#E53935]">*</span></label>
				<select
					id="birthYear"
					name="birthYear"
					required
					class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
				>
					<option value="" disabled selected={!form?.birthYear}>출생연도를 선택해 주세요.</option>
					{#each birthYearOptions as year}
						<option value={year} selected={String(form?.birthYear ?? '') === String(year)}>{year}년생</option>
					{/each}
				</select>
			</div>

			<div class="space-y-3">
				<label class="font-['Jua'] text-[15px] text-black">성별 <span class="text-[#E53935]">*</span></label>
				<div class="grid grid-cols-2 gap-3">
					{#each [
						{ value: 'male', label: '남성' },
						{ value: 'female', label: '여성' }
					] as gender}
						<label class="block">
							<input
								type="radio"
								name="gender"
								value={gender.value}
								required
								class="peer sr-only"
								checked={form?.gender === gender.value}
							/>
							<span class="flex h-14 items-center justify-center rounded-2xl border border-gray-300 bg-white text-[15px] font-bold text-gray-700 transition peer-checked:border-[#3B82F6] peer-checked:bg-[#EEF4FF] peer-checked:text-[#2563EB]">
								{gender.label}
							</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="border-t border-gray-200 pt-6">
				<div class="mb-3 flex items-center gap-2">
					<label for="college" class="font-['Jua'] text-[15px] text-black">소속</label>
					<span class="text-[13px] font-medium text-gray-500">(선택사항)</span>
				</div>

				<div class="space-y-3">
					<select
						id="college"
						name="college"
						bind:value={selectedCollege}
						class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
					>
						<option value="">단과대학을 선택해 주세요.</option>
						{#each Object.keys(universityData) as college}
							<option value={college}>{college}</option>
						{/each}
					</select>

					<select
						name="department"
						bind:value={selectedDepartment}
						disabled={!selectedCollege}
						class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
					>
						<option value="">학부(과)를 선택해 주세요.</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>

					<p class="text-[13px] font-medium text-[#8B0029]">만나볼텨? 이용 시에는 소속 입력이 필요합니다.</p>
				</div>
			</div>

			<div class="border-t border-gray-200 pt-6">
				<div class="mb-3 flex items-center gap-2">
					<label class="font-['Jua'] text-[15px] text-black">연락처</label>
					<span class="text-[13px] font-medium text-gray-500">(선택사항)</span>
				</div>

				<div class="grid grid-cols-2 gap-3">
					{#each contactOptions as option}
						<label class="block">
							<input
								type="radio"
								name="contactType"
								value={option.value}
								bind:group={selectedContactType}
								class="peer sr-only"
							/>
							<span class="flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white text-[14px] font-bold text-gray-700 transition peer-checked:border-[#8B0029] peer-checked:bg-[#FFF1F3] peer-checked:text-[#8B0029]">
								{option.label}
							</span>
						</label>
					{/each}
				</div>

				<div class="mt-3 space-y-2">
					<input
						name="contactValue"
						type="text"
						value={form?.contactValue ?? ''}
						placeholder={contactPlaceholder}
						class="h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#8B0029] focus:ring-4 focus:ring-[#8B0029]/10"
					/>
					<p class="text-[13px] font-medium text-[#8B0029]">만나볼텨? 이용 시에는 연락처 입력이 필요합니다.</p>
				</div>
			</div>

			<label class="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
				<input
					type="checkbox"
					name="agreePrivacy"
					value="yes"
					required
					class="mt-1 h-5 w-5 rounded border-gray-300 text-[#8B0029] focus:ring-[#8B0029]"
					checked={form?.agreePrivacy === 'yes'}
				/>
				<span class="text-[13px] font-medium leading-6 text-gray-700">
					<span class="font-bold text-[#E53935]">[필수]</span> 서비스 이용을 위한 개인정보 수집 및 이용에 동의합니다.
				</span>
			</label>

			<button
				type="submit"
				class="h-14 w-full rounded-2xl bg-[#E30613] font-['Jua'] text-[16px] text-white shadow-[0_10px_25px_rgba(227,6,19,0.18)] transition active:scale-[0.99]"
			>
				시작하기
			</button>
		</form>
	</div>
</div>
