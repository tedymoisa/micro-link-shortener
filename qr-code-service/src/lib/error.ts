function getSpecificErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (typeof error === "string" || typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }

  return null;
}

function getFormattedErrorMessage(descriptiveMessage: string, error: unknown): string {
  const specificErrorMessage = getSpecificErrorMessage(error);

  if (specificErrorMessage) {
    return `${descriptiveMessage}: ${specificErrorMessage}`;
  } else {
    return descriptiveMessage;
  }
}

export { getFormattedErrorMessage };
