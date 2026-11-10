import { Button } from "@wi-tuner/ui";
import type { Ref } from "react";

export function OnboardingDialog({
    page,
    title,
    description,
    cancelLabel,
    nextLabel,
    continueLabel,
    onCancel,
    onNext,
    onContinue,
    dialogRef,
}: {
    page: 0 | 1;
    title: string;
    description: string;
    cancelLabel: string;
    nextLabel: string;
    continueLabel: string;
    onCancel(): void;
    onNext(): void;
    onContinue(): void;
    dialogRef?: Ref<HTMLElement>;
}) {
    return (
        <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            aria-describedby="onboarding-description"
            className="modal-card"
        >
            <h2 id="onboarding-title" className="text-xl font-bold">
                {title}
            </h2>
            <p id="onboarding-description" className="my-4">
                {description}
            </p>
            <div className="flex justify-end gap-2">
                <Button onClick={onCancel}>{cancelLabel}</Button>
                {page === 0 ? (
                    <Button onClick={onNext}>{nextLabel}</Button>
                ) : (
                    <Button onClick={onContinue}>{continueLabel}</Button>
                )}
            </div>
        </section>
    );
}
