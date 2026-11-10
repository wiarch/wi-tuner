export interface TemperamentFile {
    name: string;
    text(): Promise<string>;
}

export interface TemperamentExchangePort {
    isNative(): boolean;
    write(filename: string, contents: string): Promise<void>;
    read(filename: string): Promise<string>;
    share(filename: string): Promise<void>;
    download(filename: string, contents: string): void;
}

export function safeTemperamentFilename(name: string): string {
    const stem = name.replace(/\.json$/i, "");
    const cleaned = stem
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70);
    return `${cleaned || "temperament"}.json`;
}

export function downloadTemperamentJson(
    filename: string,
    contents: string,
    doc: Document = document,
): void {
    const url = URL.createObjectURL(
        new Blob([contents], { type: "application/json" }),
    );
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export function createTemperamentExchange(port: TemperamentExchangePort) {
    return {
        async exportDocument(
            filename: string,
            json: string,
        ): Promise<"download" | "share"> {
            const safe = safeTemperamentFilename(filename);
            if (port.isNative()) {
                await port.write(safe, json);
                await port.share(safe);
                return "share";
            }
            port.download(safe, json);
            return "download";
        },
        async importDocument(file: TemperamentFile): Promise<string> {
            const text = await file.text();
            if (!port.isNative()) return text;
            const safe = safeTemperamentFilename(
                file.name || "temperament.json",
            );
            await port.write(safe, text);
            return port.read(safe);
        },
    };
}
