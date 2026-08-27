import React, { useState, useMemo } from "react";
import { App, TFile } from "obsidian";
import { ChevronDown, ChevronUp, Image as ImageIcon, Minimize2 } from "lucide-react";

interface ExpandableExplanationProps {
    text: string;
    app?: App;
    defaultExpanded?: boolean;
}

/**
 * Resolves an image reference to a renderable src URL within Obsidian.
 * Handles:
 *  - Obsidian wikilinks: [[image.png]]
 *  - Vault-relative paths: assets/img.png
 *  - External http URLs (returned as-is)
 */
function resolveImageSrc(rawSrc: string, app?: App): string {
    if (!app) return rawSrc;

    // External URLs — return as-is
    if (/^https?:\/\//i.test(rawSrc)) return rawSrc;

    // Strip surrounding brackets if someone wrote [[image.png]] directly in src
    const cleaned = rawSrc.replace(/^\[\[(.+?)\]\]$/, "$1");

    // Try to resolve via vault: find TFile by name or path
    const vaultFiles = app.vault.getFiles();
    const decoded = decodeURIComponent(cleaned);

    // Match by exact path first, then by name (basename)
    const match =
        vaultFiles.find((f: TFile) => f.path === decoded) ||
        vaultFiles.find((f: TFile) => f.name === decoded) ||
        vaultFiles.find((f: TFile) => f.basename === decoded.replace(/\.[^.]+$/, ""));

    if (match) {
        return app.vault.getResourcePath(match);
    }

    // Fallback: try as-is (might be relative or absolute file path in desktop Obsidian)
    return rawSrc;
}

/**
 * Parses a markdown/wikilink image string into segments of text and image nodes.
 * Supports:
 *   - Wikilink embeds: ![[filename.png]] or ![[filename.png|alt text]]
 *   - Markdown images: ![alt](url)
 */
function parseContent(text: string, app?: App): React.ReactNode[] {
    // Combined regex: matches ![[wikilink]] or ![[wikilink|alt]] or ![alt](url)
    const imgRegex = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]|!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let nodeKey = 0;

    while ((match = imgRegex.exec(text)) !== null) {
        const before = text.substring(lastIndex, match.index);
        if (before) {
            // Preserve line breaks in text segments
            parts.push(
                <span key={nodeKey++} style={{ whiteSpace: "pre-wrap" }}>
                    {before}
                </span>
            );
        }

        let rawSrc: string;
        let alt: string;

        if (match[1] !== undefined) {
            // Wikilink embed: ![[filename.png]] or ![[filename.png|alt]]
            rawSrc = match[1].trim();
            alt = match[2]?.trim() || rawSrc;
        } else {
            // Standard markdown: ![alt](url)
            alt = match[3] || "Explanation image";
            rawSrc = match[4].trim();
        }

        const resolvedSrc = resolveImageSrc(rawSrc, app);
        parts.push(
            <ObsidianImage key={nodeKey++} src={resolvedSrc} alt={alt} />
        );

        lastIndex = match.index + match[0].length;
    }

    const remaining = text.substring(lastIndex);
    if (remaining) {
        parts.push(
            <span key={nodeKey++} style={{ whiteSpace: "pre-wrap" }}>
                {remaining}
            </span>
        );
    }

    return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}

/** Single image block with click-to-zoom */
const ObsidianImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [zoomed, setZoomed] = useState(false);
    const [errored, setErrored] = useState(false);

    if (errored) {
        return (
            <div className="qc-explanation-img-error">
                <ImageIcon size={14} />
                <span>Image not found: {alt}</span>
            </div>
        );
    }

    return (
        <>
            <div className="qc-explanation-image-wrap">
                <img
                    src={src}
                    alt={alt}
                    className="qc-explanation-img"
                    onClick={(e) => {
                        e.stopPropagation();
                        setZoomed(true);
                    }}
                    onError={() => setErrored(true)}
                    title="Click to zoom"
                />
                <div className="qc-explanation-img-caption">
                    <ImageIcon size={11} />
                    <span>{alt}</span>
                </div>
            </div>
            {zoomed && (
                <div
                    className="qc-image-lightbox-overlay"
                    onClick={() => setZoomed(false)}
                >
                    <div
                        className="qc-lightbox-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="qc-lightbox-img"
                        />
                        <button
                            type="button"
                            className="qc-btn qc-btn-primary qc-lightbox-close-btn"
                            onClick={() => setZoomed(false)}
                        >
                            <Minimize2 size={15} /> Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export const ExpandableExplanation: React.FC<ExpandableExplanationProps> = ({
    text,
    app,
    defaultExpanded = false,
}) => {
    if (!text || !text.trim()) return null;

    const hasImage =
        /!\[\[/.test(text) ||
        /!\[.*?\]\(/.test(text);

    const isLong = text.length > 200 || text.split("\n").length > 3 || hasImage;

    const [isExpanded, setIsExpanded] = useState<boolean>(
        defaultExpanded || !isLong
    );

    const renderedContent = useMemo(
        () => parseContent(text, app),
        [text, app]
    );

    return (
        <div className="qc-explanation-box">
            <div
                className="qc-explanation-header"
                onClick={() => isLong && setIsExpanded((p) => !p)}
                style={{ cursor: isLong ? "pointer" : "default" }}
            >
                <div className="qc-explanation-title">
                    <span>💡 Explanation</span>
                    {hasImage && (
                        <span className="qc-has-img-chip">
                            <ImageIcon size={11} /> Image
                        </span>
                    )}
                </div>
                {isLong && (
                    <button
                        type="button"
                        className="qc-explanation-toggle-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded((p) => !p);
                        }}
                    >
                        {isExpanded ? (
                            <>
                                <span>Collapse</span>
                                <ChevronUp size={14} />
                            </>
                        ) : (
                            <>
                                <span>Expand</span>
                                <ChevronDown size={14} />
                            </>
                        )}
                    </button>
                )}
            </div>

            <div
                className={`qc-explanation-text ${
                    !isExpanded && isLong ? "qc-explanation-clamped" : ""
                }`}
            >
                {renderedContent}
            </div>

            {!isExpanded && isLong && (
                <div
                    className="qc-explanation-fade-overlay"
                    onClick={() => setIsExpanded(true)}
                >
                    <span className="qc-fade-btn">
                        <ChevronDown size={13} /> Click to expand
                    </span>
                </div>
            )}
        </div>
    );
};
