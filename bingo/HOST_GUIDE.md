# BINGO IN! — Pub host quick guide

**Open the offline-capable host:** https://chipbutt.github.io/GameBox/bingo/

This is the working Bingo In venue-host console, not a separate app. It reuses the original GameBox 90-ball caller and card verifier.

## Before the first booking

1. Open the host page while online once, then reload it; the browser can cache the Bingo In host, calling board and display for later offline use. Test by turning Wi-Fi off before leaving.
2. In **Event setup**, enter the venue, event name, event date, ticket price per game and the separately invoiced venue fee (minimum £150). Default is five games at £1 per game per card, with a £5 five-game ticket.
3. Select **Tickets & cards** and print enough cards. Each numbered card is reusable through all five separately drawn games. Issue only printed serials you can physically hand to the buyer.
4. Under **Run the night**, upload audio files you have permission to play publicly. Audio is saved **on this browser/device** using IndexedDB — not uploaded to a server. Disable automatic computer announcements to use your own microphone (off by default).
5. Connect your own speaker and microphone and open the **audience screen** on a second display or projector. It shows only the draw, number board, game and prize allocation — never the cash register.

## Running a five-game evening

1. **Sell ticket books**, enter the player/seat and quantity, take the cash and give them the matching serial-numbered printed cards. You can cancel and refund a sale before the first number is drawn.
2. **Run the night** → Draw next number. The first draw starts game 1 automatically. You can undo the last call if needed.
3. On a claim, enter the ticket serial, winner name and amount. The computer verifies the ticket against the called numbers. Pay only when it says valid.
4. The stage pot is allocated to 1 Line / 2 Lines / Full House (20% / 30% / remainder), and split winners can receive separate payments without exceeding that total.
5. Finish all three stages and record payouts before choosing **Complete game → Next game**. The called-number board clears, while sold cards, buyers, the game pot and payout history carry forward.
6. Repeat for all five games, then use **End-of-night report** to print and **Prizes & reports** to export CSV.

## Cash and compliance

The host dashboard retains accurate ticket-stake and prize ledgers separately from the venue hosting fee. It blocks more than £5 staked per named player per game and makes every penny of ticket stakes available for prizes. **These software checks are not a substitute for authorisation.** Confirm that acting as an independent paid bingo organiser is lawful for each venue and that all applicable rules are met before accepting paid entries.

You supply the locked cash tin and starting change; the software does not process bank-card payments, deduct any commission from stakes or transfer prize cash. Use the printed/CSV figures to reconcile the tin at the end. Refunds are only available before the first number; paid claims cannot be silently deleted from the audit ledger.

## Music

Choose **Add licensed tracks** in **Run the night** and select your own MP3/WAV/etc. The playlist stays on your Mac, in this browser, across sessions. You can play, pause, skip, remove and adjust volume. **Pause music when a number is called** is enabled by default. Copyright-free/royalty-free labels do not always grant public performance permission: check each track's actual licence.

## If Wi-Fi fails

Use the cached `/GameBox/bingo/` page and the same computer for calling, ticket sales and reports. The audience screen can run in another tab/window on that device without internet. **Digital players using peer-to-peer remote connections do require network access**, but the physical-ticket pub package does not.

The live event data and imported music are stored locally in the browser. Do not clear site storage mid-event. Export a CSV and print a report at the end of each booking.
