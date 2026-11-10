import { describe, expect, it, vi } from "vitest";

import {
    createTemperamentExchange,
    safeTemperamentFilename,
} from "../src/files/temperament-exchange";

describe("temperament exchange", () => {
    it("keeps a safe json filename", () => {
        expect(safeTemperamentFilename("my tuning!.json")).toBe(
            "my-tuning.json",
        );
        expect(safeTemperamentFilename("werckmeister")).toBe(
            "werckmeister.json",
        );
    });

    it("downloads on the web without touching the filesystem", async () => {
        const download = vi.fn();
        const write = vi.fn();
        const exchange = createTemperamentExchange({
            isNative: () => false,
            write,
            read: async () => "",
            share: async () => undefined,
            download,
        });
        await expect(
            exchange.exportDocument("quarter comma", '{"cents":0}'),
        ).resolves.toBe("download");
        expect(download).toHaveBeenCalledWith(
            "quarter-comma.json",
            '{"cents":0}',
        );
        expect(write).not.toHaveBeenCalled();
        await expect(
            exchange.importDocument({
                name: "imported.json",
                text: async () => '{"cents":1}',
            }),
        ).resolves.toBe('{"cents":1}');
    });

    it("writes and shares on a device, and reads the import back from storage", async () => {
        const files = new Map<string, string>();
        const share = vi.fn(async () => undefined);
        const exchange = createTemperamentExchange({
            isNative: () => true,
            write: async (filename, contents) => {
                files.set(filename, contents);
            },
            read: async (filename) => {
                const contents = files.get(filename);
                if (contents === undefined) throw new Error("missing");
                return contents;
            },
            share,
            download: () => undefined,
        });
        await expect(
            exchange.exportDocument("young.json", '{"cents":2}'),
        ).resolves.toBe("share");
        expect(files.get("young.json")).toBe('{"cents":2}');
        expect(share).toHaveBeenCalledWith("young.json");
        await expect(
            exchange.importDocument({
                name: "../evil.json",
                text: async () => '{"cents":3}',
            }),
        ).resolves.toBe('{"cents":3}');
        expect(files.get("evil.json")).toBe('{"cents":3}');
    });
});
