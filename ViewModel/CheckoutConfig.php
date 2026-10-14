<?php
/**
 * Copyright © 2026 Roman Pasichnyk
 * SPDX-License-Identifier: OSL-3.0 OR AFL-3.0
 */

declare(strict_types=1);

namespace Zero\Braintree\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use PayPal\Braintree\Model\Adapter\BraintreeAdapter;
use Zero\Checkout\ViewModel\Checkout\CheckoutPage;

/**
 * What Zero Checkout's Braintree card form needs: a client token for the
 * Hosted Fields SDK, generated at render time (what stock's ConfigProvider does
 * for its own checkout).
 */
class CheckoutConfig implements ArgumentInterface
{
    public function __construct(
        private readonly CheckoutPage $checkoutPage,
        private readonly BraintreeAdapter $braintreeAdapter
    ) {
    }

    /**
     * Null when braintree isn't offered on this checkout or token generation
     * fails (bad credentials, gateway down); the card form isn't rendered then.
     *
     * @return string|null
     */
    public function getClientToken(): ?string
    {
        if (!$this->checkoutPage->isPaymentMethodAvailable('braintree')) {
            return null;
        }

        try {
            $token = $this->braintreeAdapter->generate();
        } catch (\Throwable $e) {
            return null;
        }

        return $token !== '' ? (string) $token : null;
    }
}
