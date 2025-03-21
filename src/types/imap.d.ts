declare module "imap" {
  import { EventEmitter } from "events";
  import { ReadableStream } from "stream";

  export interface ImapFetchOptions {
    bodies?: string | string[];
    struct?: boolean;
    envelope?: boolean;
    size?: boolean;
    modifiers?: { [key: string]: any };
  }

  export interface ImapSearchOptions {
    charset?: string;
  }

  export interface ImapBoxInfo {
    name: string;
    flags: string[];
    readOnly: boolean;
    uidvalidity: number;
    uidnext: number;
    permFlags: string[];
    keywords: string[];
    newKeywords: boolean;
    persistentUIDs: boolean;
    nomodseq: boolean;
    messages: {
      total: number;
      new: number;
      unseen: number;
    };
  }

  export interface ImapMessageAttributes {
    uid: number;
    flags: string[];
    date: Date;
    struct: any;
    envelope: any;
    size: number;
    [key: string]: any;
  }

  export interface ImapMessage extends EventEmitter {
    on(event: "body", listener: (stream: ReadableStream, info: any) => void): this;
    on(event: "attributes", listener: (attrs: ImapMessageAttributes) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: "end", listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    attributes: ImapMessageAttributes;
  }

  export interface ImapFetch extends EventEmitter {
    on(event: "message", listener: (msg: ImapMessage, seqno: number) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: "end", listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }

  export interface Box {
    name: string;
    flags: string[];
    readOnly: boolean;
    uidvalidity: number;
    uidnext: number;
    permFlags: string[];
    keywords: string[];
    newKeywords: boolean;
    persistentUIDs: boolean;
    nomodseq: boolean;
    messages: {
      total: number;
      new: number;
      unseen: number;
    };
  }

  export interface Connection extends EventEmitter {
    connect(): void;
    end(): void;
    openBox(
      mailboxName: string,
      openReadOnly: boolean,
      callback: (err: Error | null, mailbox: Box) => void,
    ): void;
    search(
      criteria: any[],
      callback: (err: Error | null, uids: number[]) => void,
    ): void;
    search(
      criteria: any[],
      options: ImapSearchOptions,
      callback: (err: Error | null, uids: number[]) => void,
    ): void;
    fetch(
      source: string | number | (string | number)[],
      options: ImapFetchOptions,
    ): ImapFetch;
    addFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    delFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    setFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    getBoxes(
      callback: (err: Error | null, boxes: Record<string, any>) => void,
    ): void;
    on(event: "ready", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: "ready", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }

  export interface ImapOptions {
    user: string;
    password: string;
    host: string;
    port?: number;
    tls?: boolean;
    tlsOptions?: {
      rejectUnauthorized?: boolean;
      [key: string]: any;
    };
    autotls?: "always" | "required" | "never";
    connTimeout?: number;
    authTimeout?: number;
    keepalive?: boolean | {
      interval?: number;
      idleInterval?: number;
      forceNoop?: boolean;
    };
    debug?: (info: string) => void;
  }

  export default class Imap {
    constructor(options: ImapOptions);
    connect(): void;
    end(): void;
    openBox(
      mailboxName: string,
      openReadOnly: boolean,
      callback: (err: Error | null, mailbox: Box) => void,
    ): void;
    search(
      criteria: any[],
      callback: (err: Error | null, uids: number[]) => void,
    ): void;
    search(
      criteria: any[],
      options: ImapSearchOptions,
      callback: (err: Error | null, uids: number[]) => void,
    ): void;
    fetch(
      source: string | number | (string | number)[],
      options: ImapFetchOptions,
    ): ImapFetch;
    addFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    delFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    setFlags(
      source: string | number | (string | number)[],
      flags: string | string[],
      callback: (err: Error | null) => void,
    ): void;
    getBoxes(
      callback: (err: Error | null, boxes: Record<string, any>) => void,
    ): void;
    on(event: "ready", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: "ready", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }
} 