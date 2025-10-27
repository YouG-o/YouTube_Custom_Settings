/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


function isHomePage(): boolean {
    return window.location.pathname === '/';
}

function isSearchPage(): boolean {
    return window.location.pathname === '/results';
}

function isSubscriptionsPage(): boolean {
    return window.location.pathname === '/feed/subscriptions';
}


export {
    isSearchPage,
    isHomePage,
    isSubscriptionsPage
};