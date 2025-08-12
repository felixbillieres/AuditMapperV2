# Installation
> `npm install --save @types/reactcss`

# Summary
This package contains type definitions for reactcss (http://reactcss.com/).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/reactcss.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/reactcss/index.d.ts)
````ts
import * as React from "react";

interface LoopableProps extends React.RefAttributes<any> {
    children?: React.ReactNode;
    "nth-child": number;
    "first-child"?: boolean | undefined;
    "last-child"?: boolean | undefined;
    even?: boolean | undefined;
    odd?: boolean | undefined;
}

interface HoverProps<T> extends React.RefAttributes<T> {
    children?: React.ReactNode;
    hover?: boolean | undefined;
}

interface Classes<T> {
    default: Partial<T>;
    [scope: string]: Partial<T>;
}

export type CSS = React.CSSProperties;
export function hover<A>(component: React.ComponentClass<A> | React.FunctionComponent<A>): React.ComponentClass<A>;
export function loop(index: number, length: number): LoopableProps;
export default function reactCSS<T>(classes: Classes<T>, ...activations: any[]): T;

````

### Additional Details
 * Last updated: Wed, 11 Dec 2024 14:36:56 GMT
 * Dependencies: none
 * Peer dependencies: [@types/react](https://npmjs.com/package/@types/react)

# Credits
These definitions were written by [Chris Gervang](https://github.com/chrisgervang), and [Karol Janyst](https://github.com/LKay).
