import time

from . import ConsoleSpinner, ResultError, ResultOk, Test, TestBody, TestInfo, TestManager


def add(ui, a, b):
    ui.update("Adding numbers")
    time.sleep(1)
    total = a + b
    ui.update("Checking the sum")
    time.sleep(1)
    if total == 2:
        return ResultOk("sum is correct", total)
    return ResultError("wrong sum", AssertionError(total))


def boom(ui):
    return 1 / 0


manager = TestManager(
    ui=ConsoleSpinner(),
    tests=[
        Test(TestInfo("Addition", "1 + 1 is 2"), TestBody(add, {"a": 1, "b": 1})),
        Test(TestInfo("Boom", "raises"), TestBody(boom)),
    ],
)
raise SystemExit(0 if manager.run(manager.parse()) else 1)