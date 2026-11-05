(function () {
	const PLAYERS = [
		"Вова Гаврилюк",
		"Сан Саныч",
		"Андрей Русских",
		"Стас Бушуев",
		"DedPool",
		"Паша Шерр",
		"ZAZUZAZI",
	];

	const DEFAULT_PAYOUTS = {
		7: { first: 600, second: 150, other: -150 },
		6: { first: 500, second: 100, other: -150 },
		5: { first: 450, second: 0, other: -150 },
		4: { first: 450, second: -150, other: -150 },
	};

	const PAYOUT_COUNTS = [7, 6, 5, 4];

	const ADMIN = {
		login: "Володя Гаврилюк",
		password: "admin",
	};

	const AUTH_STORAGE_KEY = "gamesScoreAuth";
	const PAYOUTS_STORAGE_KEY = "gamesScorePayouts";

	const gamesAdminActions = document.getElementById("games-admin-actions");
	const addGameBtn = document.getElementById("add-game-btn");
	const clearGamesBtn = document.getElementById("clear-games-btn");
	const gameList = document.getElementById("game-list");
	const statsBody = document.getElementById("stats-body");
	const modal = document.getElementById("add-game-modal");
	const modalTitle = document.getElementById("add-game-modal-title");
	const form = document.getElementById("add-game-form");
	const editingIdInput = document.getElementById("editing-game-id");
	const dateInput = document.getElementById("game-date");
	const playersList = document.getElementById("players-check-list");
	const selectAll = document.getElementById("select-all-players");
	const countHint = document.getElementById("players-count-hint");
	const placeFirst = document.getElementById("place-first");
	const placeSecond = document.getElementById("place-second");
	const errorEl = document.getElementById("add-game-error");
	const cancelBtn = document.getElementById("cancel-game-btn");
	const confirmBtn = document.getElementById("confirm-game-btn");

	const loginBtn = document.getElementById("login-btn");
	const topbarUser = document.getElementById("topbar-user");
	const loginModal = document.getElementById("login-modal");
	const loginForm = document.getElementById("login-form");
	const loginName = document.getElementById("login-name");
	const loginPassword = document.getElementById("login-password");
	const loginRemember = document.getElementById("login-remember");
	const loginError = document.getElementById("login-error");
	const cancelLoginBtn = document.getElementById("cancel-login-btn");

	const payoutsBody = document.getElementById("payouts-body");
	const editPayoutsBtn = document.getElementById("edit-payouts-btn");
	const payoutsModal = document.getElementById("payouts-modal");
	const payoutsForm = document.getElementById("payouts-form");
	const payoutsEditBody = document.getElementById("payouts-edit-body");
	const payoutsError = document.getElementById("payouts-error");
	const cancelPayoutsBtn = document.getElementById("cancel-payouts-btn");

	const games = [];
	let nextGameId = 1;
	let currentUser = null;
	let payouts = clonePayouts(DEFAULT_PAYOUTS);

	function clonePayouts(source) {
		const result = {};
		PAYOUT_COUNTS.forEach(function (count) {
			const row = source[count] || DEFAULT_PAYOUTS[count];
			result[count] = {
				first: Number(row.first),
				second: Number(row.second),
				other: Number(row.other),
			};
		});
		return result;
	}

	function isAdmin() {
		return currentUser === ADMIN.login;
	}

	function normalizeLogin(value) {
		return String(value || "")
			.trim()
			.replace(/\s+/g, " ");
	}

	function readStoredAuth() {
		try {
			const raw = localStorage.getItem(AUTH_STORAGE_KEY);
			if (!raw) {
				return null;
			}
			return JSON.parse(raw);
		} catch (error) {
			return null;
		}
	}

	function saveAuth(login, remember) {
		if (!remember) {
			localStorage.removeItem(AUTH_STORAGE_KEY);
			return;
		}
		localStorage.setItem(
			AUTH_STORAGE_KEY,
			JSON.stringify({
				login: login,
				remember: true,
			})
		);
	}

	function clearAuth() {
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}

	function restoreAuth() {
		const stored = readStoredAuth();
		if (stored && stored.remember && normalizeLogin(stored.login) === ADMIN.login) {
			currentUser = ADMIN.login;
		}
	}

	function readStoredPayouts() {
		try {
			const raw = localStorage.getItem(PAYOUTS_STORAGE_KEY);
			if (!raw) {
				return null;
			}
			return JSON.parse(raw);
		} catch (error) {
			return null;
		}
	}

	function savePayouts() {
		localStorage.setItem(PAYOUTS_STORAGE_KEY, JSON.stringify(payouts));
	}

	function restorePayouts() {
		const stored = readStoredPayouts();
		if (!stored) {
			payouts = clonePayouts(DEFAULT_PAYOUTS);
			return;
		}
		payouts = clonePayouts(stored);
	}

	function createEmptyStats() {
		const result = {};
		PLAYERS.forEach(function (name) {
			result[name] = {
				first: 0,
				second: 0,
				outOfPrizes: 0,
				winnings: 0,
				total: 0,
			};
		});
		return result;
	}

	function toInputDate(date) {
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		return date.getFullYear() + "-" + month + "-" + day;
	}

	function formatDisplayDate(isoDate) {
		const parts = isoDate.split("-");
		if (parts.length !== 3) {
			return isoDate;
		}
		return parts[2] + "." + parts[1] + "." + parts[0];
	}

	function formatMoney(amount) {
		return amount + " ₽";
	}

	function playersLabel(count) {
		const mod10 = count % 10;
		const mod100 = count % 100;

		if (mod10 === 1 && mod100 !== 11) {
			return count + " игрок";
		}
		if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
			return count + " игрока";
		}
		return count + " игроков";
	}

	function getPrizes(playerCount) {
		const row = payouts[playerCount];
		if (!row) {
			return null;
		}
		return {
			first: row.first,
			second: row.second,
			other: row.other,
		};
	}

	function parseMoneyInput(value) {
		const normalized = String(value || "")
			.trim()
			.replace(/\s/g, "")
			.replace(",", ".");
		const amount = Number(normalized);
		if (!Number.isFinite(amount)) {
			return null;
		}
		return Math.round(amount);
	}

	function renderPayouts() {
		payoutsBody.innerHTML = PAYOUT_COUNTS.map(function (count) {
			const row = payouts[count];
			return (
				"<tr>" +
				"<td>" +
				count +
				"</td>" +
				"<td>" +
				formatMoney(row.first) +
				"</td>" +
				"<td>" +
				formatMoney(row.second) +
				"</td>" +
				"<td>" +
				formatMoney(row.other) +
				"</td>" +
				"</tr>"
			);
		}).join("");
	}

	function renderPayoutsEditor() {
		payoutsEditBody.innerHTML = PAYOUT_COUNTS.map(function (count) {
			const row = payouts[count];
			return (
				"<tr data-count=\"" +
				count +
				'">' +
				"<td>" +
				count +
				"</td>" +
				"<td>" +
				'<input class="field__input" type="number" step="1" name="first-' +
				count +
				'" value="' +
				row.first +
				'" required />' +
				"</td>" +
				"<td>" +
				'<input class="field__input" type="number" step="1" name="second-' +
				count +
				'" value="' +
				row.second +
				'" required />' +
				"</td>" +
				"<td>" +
				'<input class="field__input" type="number" step="1" name="other-' +
				count +
				'" value="' +
				row.other +
				'" required />' +
				"</td>" +
				"</tr>"
			);
		}).join("");
	}

	function showPayoutsError(message) {
		payoutsError.textContent = message;
		payoutsError.hidden = false;
	}

	function hidePayoutsError() {
		payoutsError.hidden = true;
		payoutsError.textContent = "";
	}

	function openPayoutsModal() {
		if (!isAdmin()) {
			return;
		}
		hidePayoutsError();
		renderPayoutsEditor();
		if (typeof payoutsModal.showModal === "function") {
			payoutsModal.showModal();
		} else {
			payoutsModal.setAttribute("open", "");
		}
	}

	function closePayoutsModal() {
		if (typeof payoutsModal.close === "function") {
			payoutsModal.close();
		} else {
			payoutsModal.removeAttribute("open");
		}
		hidePayoutsError();
	}

	function getPlayerChecks() {
		return Array.from(playersList.querySelectorAll('input[type="checkbox"]'));
	}

	function getSelectedPlayers() {
		return getPlayerChecks()
			.filter(function (input) {
				return input.checked;
			})
			.map(function (input) {
				return input.value;
			});
	}

	function setSelectedPlayers(names) {
		const selected = {};
		names.forEach(function (name) {
			selected[name] = true;
		});

		getPlayerChecks().forEach(function (input) {
			input.checked = Boolean(selected[input.value]);
		});
	}

	function fillPlaceSelect(select, selectedNames, excludeName, currentValue) {
		const previous = currentValue || select.value;
		select.innerHTML = '<option value="">Выберите игрока</option>';

		selectedNames.forEach(function (name) {
			if (name === excludeName) {
				return;
			}
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			select.appendChild(option);
		});

		if (previous && selectedNames.indexOf(previous) !== -1 && previous !== excludeName) {
			select.value = previous;
		} else {
			select.value = "";
		}
	}

	function updatePlaceSelects(preferredFirst, preferredSecond) {
		const selected = getSelectedPlayers();
		const firstValue = preferredFirst !== undefined ? preferredFirst : placeFirst.value;
		const secondValue = preferredSecond !== undefined ? preferredSecond : placeSecond.value;

		fillPlaceSelect(placeFirst, selected, secondValue, firstValue);
		fillPlaceSelect(placeSecond, selected, placeFirst.value, secondValue);
	}

	function showError(message) {
		errorEl.textContent = message;
		errorEl.hidden = false;
	}

	function hideError() {
		errorEl.hidden = true;
		errorEl.textContent = "";
	}

	function updateSelectionUi() {
		const checks = getPlayerChecks();
		const selectedCount = checks.filter(function (input) {
			return input.checked;
		}).length;

		const prizes = getPrizes(selectedCount);
		if (prizes) {
			countHint.textContent =
				"Выбрано: " +
				selectedCount +
				" · 1 место: " +
				prizes.first +
				" ₽ · 2 место: " +
				prizes.second +
				" ₽ · остальные: " +
				prizes.other +
				" ₽";
		} else {
			countHint.textContent = "Выбрано: " + selectedCount + " (нужно от 4 до 7 игроков)";
		}

		selectAll.checked = checks.length > 0 && selectedCount === checks.length;
		selectAll.indeterminate = selectedCount > 0 && selectedCount < checks.length;

		updatePlaceSelects();
		hideError();
	}

	function recalculateStats() {
		const stats = createEmptyStats();

		games.forEach(function (game) {
			const prizes = getPrizes(game.players.length);
			if (!prizes) {
				return;
			}

			stats[game.first].first += 1;
			stats[game.first].winnings += Math.max(prizes.first, 0);
			stats[game.first].total += prizes.first;

			stats[game.second].second += 1;
			stats[game.second].winnings += Math.max(prizes.second, 0);
			stats[game.second].total += prizes.second;

			game.players.forEach(function (name) {
				if (name === game.first || name === game.second) {
					return;
				}
				stats[name].outOfPrizes += 1;
				stats[name].total += prizes.other;
			});
		});

		return stats;
	}

	function renderStats() {
		const stats = recalculateStats();
		const rows = PLAYERS.slice()
			.sort(function (a, b) {
				const diff = stats[b].total - stats[a].total;
				if (diff !== 0) {
					return diff;
				}
				const firstDiff = stats[b].first - stats[a].first;
				if (firstDiff !== 0) {
					return firstDiff;
				}
				return a.localeCompare(b, "ru");
			})
			.map(function (name) {
				const row = stats[name];
				return (
					"<tr>" +
					"<td>" +
					name +
					"</td>" +
					"<td>" +
					row.first +
					"</td>" +
					"<td>" +
					row.second +
					"</td>" +
					"<td>" +
					row.outOfPrizes +
					"</td>" +
					"<td>" +
					formatMoney(row.winnings) +
					"</td>" +
					"<td>" +
					formatMoney(row.total) +
					"</td>" +
					"</tr>"
				);
			});

		statsBody.innerHTML = rows.join("");
	}

	function findGameIndex(id) {
		for (let i = 0; i < games.length; i += 1) {
			if (String(games[i].id) === String(id)) {
				return i;
			}
		}
		return -1;
	}

	function renderGames() {
		const admin = isAdmin();

		gameList.innerHTML = games
			.map(function (game, index) {
				const editButton = admin
					? '<button class="game-row__edit" type="button" data-edit-id="' +
					  game.id +
					  '">Редактировать</button>'
					: "";

				return (
					'<li class="game-row' +
					(admin ? " game-row--editable" : "") +
					'" data-game-id="' +
					game.id +
					'" title="' +
					game.players.join(", ") +
					" | 1: " +
					game.first +
					" | 2: " +
					game.second +
					'">' +
					'<span class="game-row__date">' +
					formatDisplayDate(game.date) +
					"</span>" +
					'<span class="game-row__title">Игра ' +
					(index + 1) +
					"</span>" +
					'<span class="game-row__players">' +
					playersLabel(game.players.length) +
					"</span>" +
					editButton +
					"</li>"
				);
			})
			.join("");
	}

	function refresh() {
		renderGames();
		renderStats();
		renderPayouts();
	}

	function resetForm() {
		editingIdInput.value = "";
		modalTitle.textContent = "Новая игра";
		confirmBtn.textContent = "Добавить";
		dateInput.value = toInputDate(new Date());
		getPlayerChecks().forEach(function (input) {
			input.checked = false;
		});
		selectAll.checked = false;
		selectAll.indeterminate = false;
		placeFirst.innerHTML = '<option value="">Выберите игрока</option>';
		placeSecond.innerHTML = '<option value="">Выберите игрока</option>';
		hideError();
		updateSelectionUi();
	}

	function fillForm(game) {
		editingIdInput.value = String(game.id);
		modalTitle.textContent = "Редактировать игру";
		confirmBtn.textContent = "Сохранить";
		dateInput.value = game.date;
		setSelectedPlayers(game.players);
		selectAll.checked = game.players.length === PLAYERS.length;
		selectAll.indeterminate = false;
		updatePlaceSelects(game.first, game.second);
		hideError();

		const prizes = getPrizes(game.players.length);
		if (prizes) {
			countHint.textContent =
				"Выбрано: " +
				game.players.length +
				" · 1 место: " +
				prizes.first +
				" ₽ · 2 место: " +
				prizes.second +
				" ₽ · остальные: " +
				prizes.other +
				" ₽";
		}
	}

	function renderPlayers() {
		playersList.innerHTML = PLAYERS.map(function (name, index) {
			const id = "player-" + index;
			return (
				"<li>" +
				'<label class="check" for="' +
				id +
				'">' +
				'<input type="checkbox" id="' +
				id +
				'" name="players" value="' +
				name.replace(/"/g, "&quot;") +
				'" />' +
				"<span>" +
				name +
				"</span>" +
				"</label>" +
				"</li>"
			);
		}).join("");
	}

	function openModal() {
		if (typeof modal.showModal === "function") {
			modal.showModal();
		} else {
			modal.setAttribute("open", "");
		}
		dateInput.focus();
	}

	function closeModal() {
		if (typeof modal.close === "function") {
			modal.close();
		} else {
			modal.removeAttribute("open");
		}
		editingIdInput.value = "";
	}

	function openCreateModal() {
		if (!isAdmin()) {
			return;
		}
		resetForm();
		openModal();
	}

	function openEditModal(gameId) {
		if (!isAdmin()) {
			return;
		}
		const index = findGameIndex(gameId);
		if (index === -1) {
			return;
		}
		fillForm(games[index]);
		openModal();
	}

	function showLoginError(message) {
		loginError.textContent = message;
		loginError.hidden = false;
	}

	function hideLoginError() {
		loginError.hidden = true;
		loginError.textContent = "";
	}

	function updateAuthUi() {
		const admin = isAdmin();

		if (currentUser) {
			topbarUser.hidden = false;
			topbarUser.textContent = currentUser + (admin ? " (админ)" : "");
			loginBtn.textContent = "Выход";
		} else {
			topbarUser.hidden = true;
			topbarUser.textContent = "";
			loginBtn.textContent = "Вход";
		}

		gamesAdminActions.hidden = !admin;
		editPayoutsBtn.hidden = !admin;
		renderGames();
	}

	function clearGames() {
		if (!isAdmin()) {
			return;
		}

		if (games.length === 0) {
			return;
		}

		const confirmed = window.confirm("Очистить список игр и сбросить статистику?");
		if (!confirmed) {
			return;
		}

		games.length = 0;
		nextGameId = 1;
		refresh();
	}

	function openLoginModal() {
		loginForm.reset();
		hideLoginError();
		const stored = readStoredAuth();
		loginRemember.checked = Boolean(stored && stored.remember);
		if (typeof loginModal.showModal === "function") {
			loginModal.showModal();
		} else {
			loginModal.setAttribute("open", "");
		}
		loginName.focus();
	}

	function closeLoginModal() {
		if (typeof loginModal.close === "function") {
			loginModal.close();
		} else {
			loginModal.removeAttribute("open");
		}
		hideLoginError();
	}

	function logout() {
		currentUser = null;
		clearAuth();
		updateAuthUi();
		if (typeof modal.close === "function" && modal.open) {
			modal.close();
		}
		if (typeof payoutsModal.close === "function" && payoutsModal.open) {
			payoutsModal.close();
		}
	}

	restoreAuth();
	restorePayouts();
	renderPlayers();
	refresh();
	updateAuthUi();

	editPayoutsBtn.addEventListener("click", openPayoutsModal);
	cancelPayoutsBtn.addEventListener("click", closePayoutsModal);

	payoutsForm.addEventListener("submit", function (event) {
		event.preventDefault();

		if (!isAdmin()) {
			showPayoutsError("Только администратор может менять выплаты");
			return;
		}

		const nextPayouts = {};

		for (let i = 0; i < PAYOUT_COUNTS.length; i += 1) {
			const count = PAYOUT_COUNTS[i];
			const first = parseMoneyInput(
				payoutsEditBody.querySelector('[name="first-' + count + '"]').value
			);
			const second = parseMoneyInput(
				payoutsEditBody.querySelector('[name="second-' + count + '"]').value
			);
			const other = parseMoneyInput(
				payoutsEditBody.querySelector('[name="other-' + count + '"]').value
			);

			if (first === null || second === null || other === null) {
				showPayoutsError("Введите корректные суммы для всех строк");
				return;
			}

			nextPayouts[count] = {
				first: first,
				second: second,
				other: other,
			};
		}

		payouts = clonePayouts(nextPayouts);
		savePayouts();
		refresh();
		closePayoutsModal();
	});

	payoutsModal.addEventListener("cancel", hidePayoutsError);

	loginBtn.addEventListener("click", function () {
		if (currentUser) {
			logout();
			return;
		}
		openLoginModal();
	});

	cancelLoginBtn.addEventListener("click", closeLoginModal);

	loginForm.addEventListener("submit", function (event) {
		event.preventDefault();

		const name = normalizeLogin(loginName.value);
		const password = loginPassword.value;
		const remember = loginRemember.checked;

		if (!name || !password) {
			showLoginError("Введите логин и пароль");
			return;
		}

		if (name !== ADMIN.login || password !== ADMIN.password) {
			showLoginError("Неверный логин или пароль");
			return;
		}

		currentUser = ADMIN.login;
		saveAuth(ADMIN.login, remember);
		updateAuthUi();
		closeLoginModal();
	});

	loginModal.addEventListener("cancel", hideLoginError);

	addGameBtn.addEventListener("click", openCreateModal);
	clearGamesBtn.addEventListener("click", clearGames);
	cancelBtn.addEventListener("click", closeModal);

	selectAll.addEventListener("change", function () {
		const checked = selectAll.checked;
		getPlayerChecks().forEach(function (input) {
			input.checked = checked;
		});
		updateSelectionUi();
	});

	playersList.addEventListener("change", function (event) {
		if (event.target && event.target.matches('input[type="checkbox"]')) {
			updateSelectionUi();
		}
	});

	placeFirst.addEventListener("change", function () {
		updatePlaceSelects();
		hideError();
	});

	placeSecond.addEventListener("change", function () {
		updatePlaceSelects();
		hideError();
	});

	gameList.addEventListener("click", function (event) {
		const button = event.target.closest("[data-edit-id]");
		if (!button) {
			return;
		}
		openEditModal(button.getAttribute("data-edit-id"));
	});

	form.addEventListener("submit", function (event) {
		event.preventDefault();

		if (!isAdmin()) {
			showError("Только администратор может изменять игры");
			return;
		}

		const selected = getSelectedPlayers();
		const prizes = getPrizes(selected.length);

		if (!prizes) {
			showError("В игре должно быть от 4 до 7 игроков");
			return;
		}

		const firstName = placeFirst.value;
		const secondName = placeSecond.value;

		if (!firstName || !secondName) {
			showError("Укажите 1 и 2 место");
			return;
		}

		if (firstName === secondName) {
			showError("1 и 2 место должны быть разными");
			return;
		}

		if (selected.indexOf(firstName) === -1 || selected.indexOf(secondName) === -1) {
			showError("Призёры должны быть среди выбранных игроков");
			return;
		}

		const payload = {
			date: dateInput.value,
			players: selected.slice(),
			first: firstName,
			second: secondName,
		};

		const editingId = editingIdInput.value;
		if (editingId) {
			const index = findGameIndex(editingId);
			if (index === -1) {
				showError("Игра не найдена");
				return;
			}
			games[index] = {
				id: games[index].id,
				date: payload.date,
				players: payload.players,
				first: payload.first,
				second: payload.second,
			};
		} else {
			games.push({
				id: nextGameId,
				date: payload.date,
				players: payload.players,
				first: payload.first,
				second: payload.second,
			});
			nextGameId += 1;
		}

		refresh();
		closeModal();
	});

	modal.addEventListener("cancel", hideError);
})();
