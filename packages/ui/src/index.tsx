import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ asChild = false, className = "", ...props }, ref) => {
        const Component: React.ElementType = asChild ? Slot : "button";
        return (
            <Component
                ref={ref}
                className={`wi-button ${className}`.trim()}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";
