import re
from typing import Any, Callable
from dataclasses import dataclass


@dataclass
class TemplateUnit:
    old: str
    rep: Any
    convert: Callable[[Any], str] = str

    def replace(self, text: str) -> str:
        return text.replace(self.old, self.convert(self.rep))


class Template:
    def __init__(self, text: str):
        self.text = text
        self.units: list[TemplateUnit] = []

    def add_unit(self, unit:TemplateUnit) -> None:
        self.units.append(unit)

    def add(self, old: str, rep: Any, convert: Callable[[Any], str] = str) -> "Template":
        self.add_unit(TemplateUnit(old, rep, convert))
        return self

    def render(self, use_regex: bool = True) -> str:
        if use_regex:
            return self._rg_render()
        result = self.text
        for unit in self.units:
            result = unit.replace(result)
        return result

    def _rg_render(self) -> str:
        replacements = {unit.old: unit.convert(unit.rep) for unit in self.units}
        pattern = re.compile("|".join(re.escape(unit.old) for unit in self.units))
        return pattern.sub(lambda match: replacements[match.group()], self.text)
