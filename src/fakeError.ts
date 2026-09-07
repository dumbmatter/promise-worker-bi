export type FakeError = {
	name: string;
	message: string;
	stack?: string;
	fileName?: string;
	columnNumber?: number;
	lineNumber?: number;
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
	if (candidate.fileName !== undefined && typeof candidate.fileName !== "string") {
		return false;
	}
	if (candidate.columnNumber !== undefined && typeof candidate.columnNumber !== "number") {
		return false;
	}
	if (candidate.lineNumber !== undefined && typeof candidate.lineNumber !== "number") {
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

	// These are non-standard properties, I think only in some versions of Firefox
	// @ts-expect-error
	if (typeof error.fileName === "string") {
		// @ts-expect-error
		fakeError.fileName = error.fileName;
	}
	// @ts-expect-error
	if (typeof error.columnNumber === "number") {
		// @ts-expect-error
		fakeError.columnNumber = error.columnNumber;
	}
	// @ts-expect-error
	if (typeof error.lineNumber === "number") {
		// @ts-expect-error
		fakeError.lineNumber = error.lineNumber;
	}

	return fakeError;
};

// Object rather than FakeError for convenience
export const fromFakeError = (fakeError: unknown): Error => {
	const error = new Error();
	return Object.assign(error, fakeError);
};
