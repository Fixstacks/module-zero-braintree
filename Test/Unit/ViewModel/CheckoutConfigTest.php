<?php
/**
 * Copyright © 2026 Roman Pasichnyk
 * SPDX-License-Identifier: OSL-3.0 OR AFL-3.0
 */

declare(strict_types=1);

namespace Zero\Braintree\Test\Unit\ViewModel;

use PayPal\Braintree\Model\Adapter\BraintreeAdapter;
use PHPUnit\Framework\TestCase;
use Zero\Braintree\ViewModel\CheckoutConfig;
use Zero\Checkout\ViewModel\Checkout\CheckoutPage;

class CheckoutConfigTest extends TestCase
{
    public function testNoTokenRequestedWhenBraintreeIsNotOffered(): void
    {
        $adapter = $this->createMock(BraintreeAdapter::class);
        $adapter->expects($this->never())->method('generate');

        $this->assertNull($this->config(false, $adapter)->getClientToken());
    }

    public function testGatewayFailureHidesTheFormInsteadOfBreakingCheckout(): void
    {
        $adapter = $this->createStub(BraintreeAdapter::class);
        $adapter->method('generate')->willThrowException(new \RuntimeException('bad credentials'));

        $this->assertNull($this->config(true, $adapter)->getClientToken());
    }

    public function testReturnsTheGeneratedToken(): void
    {
        $adapter = $this->createStub(BraintreeAdapter::class);
        $adapter->method('generate')->willReturn('client-token');

        $this->assertSame('client-token', $this->config(true, $adapter)->getClientToken());
    }

    private function config(bool $offered, BraintreeAdapter $adapter): CheckoutConfig
    {
        $page = $this->createStub(CheckoutPage::class);
        $page->method('isPaymentMethodAvailable')->willReturnCallback(
            static fn (string $code): bool => $offered && $code === 'braintree'
        );

        return new CheckoutConfig($page, $adapter);
    }
}
