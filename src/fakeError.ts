export type FakeError = {
	name: string;
	message: string;
	stack?: string;
};

export const isFakeError = (x: unknown): x is FakeError => {
	if (typeof x !== "object" || x === null) {
		return false;
	}

	const candidate = x as Record<string, unknown>;

	if (typeof candidate.name !== "string" || typeof candidate.message !== "string") {
		return false;
	}

	if (candidate.stack !== undefined && typeof candidate.stack !== "string") {
		return false;
	}

	return true;
};

export const toFakeError = (error: Error): FakeError => {
	const fakeError: FakeError = {
		name: error.name,
		message: error.message,
	};

	if (typeof error.stack === "string") {
		fakeError.stack = error.stack;
	}

	return fakeError;
};

// Object rather than FakeError for convenience
export const fromFakeError = (fakeError: unknown): Error => {
	const error = new Error();
	return Object.assign(error, fakeError);
};
